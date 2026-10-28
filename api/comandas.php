<?php
/**
 * API - COMANDAS NUMERADAS & ITENS
 * HostGator Plano M MySQL
 */
require_once __DIR__ . '/config.php';

$pdo = getDatabaseConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Listar comandas
    $stmt = $pdo->query("SELECT * FROM comandas ORDER BY (status = 'paga') ASC, number ASC");
    $comandas = $stmt->fetchAll();

    // Buscar itens de cada comanda
    $itemsStmt = $pdo->query("SELECT * FROM comanda_items ORDER BY added_at ASC");
    $allItems = $itemsStmt->fetchAll();

    $itemsByComanda = [];
    foreach ($allItems as $it) {
        $itemsByComanda[$it['comanda_id']][] = [
            'id' => $it['id'],
            'productId' => $it['product_id'],
            'productName' => $it['product_name'],
            'unitPrice' => (float)$it['unit_price'],
            'quantity' => (int)$it['quantity'],
            'notes' => $it['notes'] ?? '',
            'addedAt' => $it['added_at'],
        ];
    }

    $result = array_map(function($c) use ($itemsByComanda) {
        return [
            'id' => $c['id'],
            'number' => (int)$c['number'],
            'identifier' => $c['identifier'],
            'customerName' => $c['customer_name'] ?? '',
            'status' => $c['status'],
            'openedAt' => $c['opened_at'],
            'closedAt' => $c['closed_at'],
            'notes' => $c['notes'] ?? '',
            'includeServiceCharge' => (bool)$c['include_service_charge'],
            'serviceChargePercent' => (int)$c['service_charge_percent'],
            'paymentMethod' => $c['payment_method'] ?? null,
            'totalPaid' => (float)$c['total_paid'],
            'items' => $itemsByComanda[$c['id']] ?? [],
        ];
    }, $comandas);

    sendResponse($result);
}

if ($method === 'POST') {
    $data = getRequestBody();
    $action = $data['action'] ?? 'open';

    // 1. Abrir Nova Comanda
    if ($action === 'open') {
        $identifier = trim($data['identifier'] ?? 'Balcão');
        $customerName = trim($data['customerName'] ?? '');
        $notes = trim($data['notes'] ?? '');

        // Pegar próximo número sequencial
        $numStmt = $pdo->query("SELECT COALESCE(MAX(number), 0) + 1 AS next_num FROM comandas WHERE DATE(opened_at) = CURDATE()");
        $nextNum = (int)$numStmt->fetchColumn();

        $id = 'cmd-' . round(microtime(true) * 1000);
        $openedAt = date('Y-m-d H:i:s');

        $stmt = $pdo->prepare("INSERT INTO comandas (id, number, identifier, customer_name, status, opened_at, notes, include_service_charge, service_charge_percent)
            VALUES (?, ?, ?, ?, 'aberta', ?, ?, 1, 10)");
        $stmt->execute([$id, $nextNum, $identifier, $customerName, $openedAt, $notes]);

        sendResponse([
            'id' => $id,
            'number' => $nextNum,
            'identifier' => $identifier,
            'customerName' => $customerName,
            'status' => 'aberta',
            'openedAt' => $openedAt,
            'notes' => $notes,
            'includeServiceCharge' => true,
            'serviceChargePercent' => 10,
            'items' => [],
        ]);
    }

    // 2. Lançar Item na Comanda
    if ($action === 'add_item') {
        $comandaId = $data['comandaId'] ?? null;
        $productId = $data['productId'] ?? null;
        $quantity = max(1, (int)($data['quantity'] ?? 1));
        $notes = trim($data['notes'] ?? '');

        if (!$comandaId || !$productId) sendError('comandaId e productId obrigatórios');

        // Buscar detalhes do produto
        $prodStmt = $pdo->prepare("SELECT name, price, recipe_ingredients_json FROM products WHERE id = ?");
        $prodStmt->execute([$productId]);
        $prod = $prodStmt->fetch();
        if (!$prod) sendError('Produto não encontrado');

        $itemId = 'item-' . round(microtime(true) * 1000);
        $now = date('Y-m-d H:i:s');

        $stmt = $pdo->prepare("INSERT INTO comanda_items (id, comanda_id, product_id, product_name, unit_price, quantity, notes, added_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$itemId, $comandaId, $productId, $prod['name'], $prod['price'], $quantity, $notes, $now]);

        // Reduzir estoque de garrafas proporcionalmente se houver ficha técnica
        if (!empty($prod['recipe_ingredients_json'])) {
            $recipes = json_decode($prod['recipe_ingredients_json'], true);
            if (is_array($recipes)) {
                foreach ($recipes as $r) {
                    $bId = $r['bottleId'] ?? null;
                    $mlPerDrink = (int)($r['mlPerDrink'] ?? 0);
                    $totalMlNeeded = $mlPerDrink * $quantity;

                    if ($bId && $totalMlNeeded > 0) {
                        // Descontar da garrafa aberta e repor da reserva se zerar
                        $bStmt = $pdo->prepare("SELECT bottle_capacity_ml, open_bottle_current_ml, sealed_bottles_count FROM bottles WHERE id = ?");
                        $bStmt->execute([$bId]);
                        $bot = $bStmt->fetch();

                        if ($bot) {
                            $curMl = (int)$bot['open_bottle_current_ml'];
                            $capMl = (int)$bot['bottle_capacity_ml'];
                            $sealed = (int)$bot['sealed_bottles_count'];

                            if ($curMl >= $totalMlNeeded) {
                                $newMl = $curMl - $totalMlNeeded;
                                $upd = $pdo->prepare("UPDATE bottles SET open_bottle_current_ml = ? WHERE id = ?");
                                $upd->execute([$newMl, $bId]);
                            } else {
                                $remainingNeed = $totalMlNeeded - $curMl;
                                $bottlesToOpen = (int)ceil($remainingNeed / $capMl);
                                $actualOpen = min($sealed, $bottlesToOpen);
                                $newSealed = max(0, $sealed - $actualOpen);
                                $newMl = max(0, ($curMl + ($actualOpen * $capMl)) - $totalMlNeeded);

                                $upd = $pdo->prepare("UPDATE bottles SET open_bottle_current_ml = ?, sealed_bottles_count = ? WHERE id = ?");
                                $upd->execute([$newMl, $newSealed, $bId]);
                            }
                        }
                    }
                }
            }
        }

        sendResponse(['itemId' => $itemId, 'message' => 'Item lançado com sucesso!']);
    }

    // 3. Remover Item da Comanda
    if ($action === 'remove_item') {
        $itemId = $data['itemId'] ?? null;
        if (!$itemId) sendError('itemId obrigatório');
        $stmt = $pdo->prepare("DELETE FROM comanda_items WHERE id = ?");
        $stmt->execute([$itemId]);
        sendResponse(['deletedItem' => $itemId]);
    }

    // 4. Alterar Status (ex: pedir conta)
    if ($action === 'update_status') {
        $comandaId = $data['comandaId'] ?? null;
        $status = $data['status'] ?? 'aberta';
        if (!$comandaId) sendError('comandaId obrigatório');
        $stmt = $pdo->prepare("UPDATE comandas SET status = ? WHERE id = ?");
        $stmt->execute([$status, $comandaId]);
        sendResponse(['updatedStatus' => $status]);
    }

    // 5. Alternar Taxa de Serviço
    if ($action === 'toggle_service') {
        $comandaId = $data['comandaId'] ?? null;
        if (!$comandaId) sendError('comandaId obrigatório');
        $stmt = $pdo->prepare("UPDATE comandas SET include_service_charge = NOT include_service_charge WHERE id = ?");
        $stmt->execute([$comandaId]);
        sendResponse(['toggledService' => true]);
    }

    // 6. Fechar Comanda com Pagamento no Caixa
    if ($action === 'close_and_pay') {
        $comandaId = $data['comandaId'] ?? null;
        $paymentMethod = $data['paymentMethod'] ?? 'pix';
        $amountReceived = isset($data['amountReceived']) ? (float)$data['amountReceived'] : null;
        $splitsJson = !empty($data['paymentSplits']) ? json_encode($data['paymentSplits'], JSON_UNESCAPED_UNICODE) : null;

        if (!$comandaId) sendError('comandaId obrigatório');

        // Calcular total da comanda
        $cStmt = $pdo->prepare("SELECT * FROM comandas WHERE id = ?");
        $cStmt->execute([$comandaId]);
        $comanda = $cStmt->fetch();
        if (!$comanda) sendError('Comanda não encontrada');

        $iStmt = $pdo->prepare("SELECT product_name, unit_price, quantity FROM comanda_items WHERE comanda_id = ?");
        $iStmt->execute([$comandaId]);
        $items = $iStmt->fetchAll();

        $subtotal = 0;
        $summary = [];
        foreach ($items as $it) {
            $subtotal += ((float)$it['unit_price'] * (int)$it['quantity']);
            $summary[] = ['name' => $it['product_name'], 'quantity' => (int)$it['quantity'], 'price' => (float)$it['unit_price']];
        }

        $serviceCharge = $comanda['include_service_charge'] ? ($subtotal * 0.10) : 0.00;
        $totalToPay = $subtotal + $serviceCharge;
        $changeGiven = ($paymentMethod === 'dinheiro' && $amountReceived && $amountReceived > $totalToPay) ? ($amountReceived - $totalToPay) : 0.00;

        $now = date('Y-m-d H:i:s');

        // Atualizar comanda para 'paga'
        $upd = $pdo->prepare("UPDATE comandas SET status = 'paga', closed_at = ?, payment_method = ?, total_paid = ? WHERE id = ?");
        $upd->execute([$now, $paymentMethod, $totalToPay, $comandaId]);

        // Criar registro de transação financeira
        $txId = 'tx-cmd-' . round(microtime(true) * 1000);
        $tStmt = $pdo->prepare("INSERT INTO transactions (id, comanda_id, comanda_number, type, description, amount, service_charge_amount, payment_method, payment_splits_json, amount_received, change_given, items_summary_json, timestamp)
            VALUES (?, ?, ?, 'comanda_fechada', ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $desc = "Fechamento Comanda #{$comanda['number']} - {$comanda['identifier']}";
        $tStmt->execute([
            $txId, $comandaId, $comanda['number'], $desc, $totalToPay, $serviceCharge,
            $paymentMethod, $splitsJson, $amountReceived, $changeGiven,
            json_encode($summary, JSON_UNESCAPED_UNICODE), $now
        ]);

        // Atualizar saldo do caixa
        $cashDelta = ($paymentMethod === 'dinheiro') ? $totalToPay : 0;
        $pdo->query("UPDATE cash_register SET 
            total_revenue = total_revenue + {$totalToPay},
            total_service_charge = total_service_charge + {$serviceCharge},
            current_cash_balance = current_cash_balance + {$cashDelta}
            WHERE id = 1");

        sendResponse(['paid' => true, 'total' => $totalToPay, 'change' => $changeGiven]);
    }
}

sendError('Método não permitido', 405);

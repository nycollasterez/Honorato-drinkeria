<?php
/**
 * API - CAIXA PDV, MOVIMENTAÇÕES & FECHAMENTO DIÁRIO
 * HostGator Plano M MySQL
 */
require_once __DIR__ . '/config.php';

$pdo = getDatabaseConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Estado atual do caixa
    $cStmt = $pdo->query("SELECT * FROM cash_register WHERE id = 1");
    $cash = $cStmt->fetch();

    if (!$cash) {
        $cash = [
            'isOpen' => true,
            'openedAt' => date('Y-m-d H:i:s'),
            'initialCash' => 300.0,
            'currentCashBalance' => 300.0,
            'totalRevenue' => 0.0,
            'totalServiceCharge' => 0.0,
            'byPaymentMethod' => ['pix' => 0, 'cartao_credito' => 0, 'cartao_debito' => 0, 'dinheiro' => 0, 'misto' => 0]
        ];
    } else {
        $cash = [
            'isOpen' => (bool)$cash['is_open'],
            'openedAt' => $cash['opened_at'],
            'initialCash' => (float)$cash['initial_cash'],
            'currentCashBalance' => (float)$cash['current_cash_balance'],
            'totalRevenue' => (float)$cash['total_revenue'],
            'totalServiceCharge' => (float)$cash['total_service_charge'],
            'byPaymentMethod' => json_decode($cash['by_payment_method_json'] ?: '{}', true) ?: [
                'pix' => 0, 'cartao_credito' => 0, 'cartao_debito' => 0, 'dinheiro' => 0, 'misto' => 0
            ]
        ];
    }

    // Histórico de relatórios de fechamento
    $rStmt = $pdo->query("SELECT * FROM daily_closing_reports ORDER BY date DESC, closed_at DESC LIMIT 60");
    $reports = $rStmt->fetchAll();

    $formattedReports = array_map(function($r) {
        return [
            'id' => $r['id'],
            'date' => $r['date'],
            'openedAt' => $r['opened_at'],
            'closedAt' => $r['closed_at'],
            'closedBy' => $r['closed_by'],
            'initialCash' => (float)$r['initial_cash'],
            'finalCashBalance' => (float)$r['final_cash_balance'],
            'totalRevenue' => (float)$r['total_revenue'],
            'totalServiceCharge' => (float)$r['total_service_charge'],
            'comandasCount' => (int)$r['comandas_count'],
            'transactionsCount' => (int)$r['transactions_count'],
            'byPaymentMethod' => json_decode($r['by_payment_method_json'] ?: '{}', true),
            'topProductsSold' => json_decode($r['top_products_sold_json'] ?: '[]', true),
            'notes' => $r['notes'] ?? '',
        ];
    }, $reports);

    sendResponse([
        'cashRegister' => $cash,
        'closingReports' => $formattedReports,
    ]);
}

if ($method === 'POST') {
    $data = getRequestBody();
    $action = $data['action'] ?? '';

    // 1. Venda Direta de Balcão
    if ($action === 'venda_balcao') {
        $items = $data['items'] ?? [];
        $paymentMethod = $data['paymentMethod'] ?? 'pix';
        $amountReceived = isset($data['amountReceived']) ? (float)$data['amountReceived'] : null;

        if (empty($items)) sendError('Nenhum item na venda');

        $totalAmount = 0;
        $summary = [];

        foreach ($items as $item) {
            $pId = $item['productId'] ?? null;
            $qty = (int)($item['quantity'] ?? 1);
            if (!$pId || $qty <= 0) continue;

            $pStmt = $pdo->prepare("SELECT name, price, recipe_ingredients_json FROM products WHERE id = ?");
            $pStmt->execute([$pId]);
            $prod = $pStmt->fetch();
            if (!$prod) continue;

            $sub = (float)$prod['price'] * $qty;
            $totalAmount += $sub;
            $summary[] = ['name' => $prod['name'], 'quantity' => $qty, 'price' => (float)$prod['price']];

            // Descontar insumos de garrafa
            if (!empty($prod['recipe_ingredients_json'])) {
                $recipes = json_decode($prod['recipe_ingredients_json'], true);
                if (is_array($recipes)) {
                    foreach ($recipes as $r) {
                        $bId = $r['bottleId'] ?? null;
                        $ml = (int)($r['mlPerDrink'] ?? 0) * $qty;
                        if ($bId && $ml > 0) {
                            $pdo->query("UPDATE bottles SET open_bottle_current_ml = GREATEST(0, open_bottle_current_ml - {$ml}) WHERE id = '{$bId}'");
                        }
                    }
                }
            }
        }

        $changeGiven = ($paymentMethod === 'dinheiro' && $amountReceived && $amountReceived > $totalAmount) ? ($amountReceived - $totalAmount) : 0;
        $now = date('Y-m-d H:i:s');
        $txId = 'tx-balcao-' . round(microtime(true) * 1000);

        $tStmt = $pdo->prepare("INSERT INTO transactions (id, type, description, amount, service_charge_amount, payment_method, amount_received, change_given, items_summary_json, timestamp)
            VALUES (?, 'venda_balcao', 'Venda Rápida de Balcão', ?, 0.00, ?, ?, ?, ?, ?)");
        $tStmt->execute([
            $txId, $totalAmount, $paymentMethod, $amountReceived, $changeGiven,
            json_encode($summary, JSON_UNESCAPED_UNICODE), $now
        ]);

        $cashDelta = ($paymentMethod === 'dinheiro') ? $totalAmount : 0;
        $pdo->query("UPDATE cash_register SET 
            total_revenue = total_revenue + {$totalAmount},
            current_cash_balance = current_cash_balance + {$cashDelta}
            WHERE id = 1");

        sendResponse(['txId' => $txId, 'total' => $totalAmount, 'change' => $changeGiven]);
    }

    // 2. Sangria ou Suprimento
    if ($action === 'movimentacao') {
        $type = $data['type'] ?? 'sangria';
        $amount = (float)($data['amount'] ?? 0);
        $description = trim($data['description'] ?? '');

        if ($amount <= 0 || empty($description)) sendError('Valor e motivo são obrigatórios');

        $now = date('Y-m-d H:i:s');
        $txId = 'tx-mov-' . round(microtime(true) * 1000);
        $fullDesc = ($type === 'suprimento' ? 'Suprimento (Entrada): ' : 'Sangria (Retirada): ') . $description;

        $tStmt = $pdo->prepare("INSERT INTO transactions (id, type, description, amount, service_charge_amount, payment_method, timestamp)
            VALUES (?, ?, ?, ?, 0.00, 'dinheiro', ?)");
        $tStmt->execute([$txId, $type, $fullDesc, $amount, $now]);

        $cashChange = ($type === 'suprimento') ? $amount : -$amount;
        $pdo->query("UPDATE cash_register SET current_cash_balance = GREATEST(0, current_cash_balance + ({$cashChange})) WHERE id = 1");

        sendResponse(['txId' => $txId, 'type' => $type, 'amount' => $amount]);
    }

    // 3. Fechamento de Caixa Diário (Gera Relatório Executivo A4)
    if ($action === 'fechamento') {
        $closedBy = trim($data['closedBy'] ?? 'Gerência');
        $notes = trim($data['notes'] ?? '');

        $cStmt = $pdo->query("SELECT * FROM cash_register WHERE id = 1");
        $cash = $cStmt->fetch();

        $todayStr = date('Y-m-d');
        $now = date('Y-m-d H:i:s');
        $reportId = 'rep-day-' . round(microtime(true) * 1000);

        // Agrupar produtos mais vendidos do dia
        $txStmt = $pdo->query("SELECT items_summary_json FROM transactions WHERE DATE(timestamp) = CURDATE() AND items_summary_json IS NOT NULL");
        $txRows = $txStmt->fetchAll();

        $counts = [];
        foreach ($txRows as $r) {
            $items = json_decode($r['items_summary_json'] ?: '[]', true);
            if (is_array($items)) {
                foreach ($items as $it) {
                    $name = $it['name'] ?? 'Item';
                    $qty = (int)($it['quantity'] ?? 1);
                    $pr = (float)($it['price'] ?? 0);
                    if (!isset($counts[$name])) $counts[$name] = ['name' => $name, 'quantity' => 0, 'totalRevenue' => 0];
                    $counts[$name]['quantity'] += $qty;
                    $counts[$name]['totalRevenue'] += ($qty * $pr);
                }
            }
        }
        usort($counts, function($a, $b) { return $b['quantity'] - $a['quantity']; });
        $topProducts = array_values(array_slice($counts, 0, 8));

        // Contar comandas e transações
        $cmdCount = (int)$pdo->query("SELECT COUNT(*) FROM comandas WHERE DATE(opened_at) = CURDATE() AND status = 'paga'")->fetchColumn();
        $txCount = (int)$pdo->query("SELECT COUNT(*) FROM transactions WHERE DATE(timestamp) = CURDATE()")->fetchColumn();

        $rStmt = $pdo->prepare("INSERT INTO daily_closing_reports (
            id, date, opened_at, closed_at, closed_by, initial_cash, final_cash_balance,
            total_revenue, total_service_charge, comandas_count, transactions_count,
            by_payment_method_json, top_products_sold_json, notes
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )");

        $rStmt->execute([
            $reportId, $todayStr, $cash['opened_at'] ?? $now, $now, $closedBy,
            (float)($cash['initial_cash'] ?? 300), (float)($cash['current_cash_balance'] ?? 300),
            (float)($cash['total_revenue'] ?? 0), (float)($cash['total_service_charge'] ?? 0),
            $cmdCount, $txCount, $cash['by_payment_method_json'] ?: '{}',
            json_encode($topProducts, JSON_UNESCAPED_UNICODE), $notes
        ]);

        // Resetar caixa para o próximo turno com o saldo final em dinheiro
        $nextInitial = (float)($cash['current_cash_balance'] ?? 300);
        $pdo->query("UPDATE cash_register SET 
            is_open = 1,
            opened_at = NOW(),
            initial_cash = {$nextInitial},
            current_cash_balance = {$nextInitial},
            total_revenue = 0.00,
            total_service_charge = 0.00,
            by_payment_method_json = '{\"pix\":0,\"cartao_credito\":0,\"cartao_debito\":0,\"dinheiro\":0,\"misto\":0}'
            WHERE id = 1");

        sendResponse(['reportId' => $reportId, 'message' => 'Fechamento concluído com sucesso!']);
    }
}

sendError('Método não permitido', 405);

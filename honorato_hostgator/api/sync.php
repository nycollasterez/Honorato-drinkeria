<?php
/**
 * API - SINCRONIZAÇÃO COMPLETA DE DADOS (FRONTEND <-> MYSQL HOSTGATOR)
 * Permite que múltiplos dispositivos (Garçom, Caixa, Gerente, Clientes) fiquem 100% atualizados
 */
require_once __DIR__ . '/config.php';

$pdo = getDatabaseConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // 1. Produtos
    $pRows = $pdo->query("SELECT * FROM products ORDER BY category ASC, name ASC")->fetchAll();
    $products = array_map(function($r) {
        return [
            'id' => $r['id'],
            'name' => $r['name'],
            'category' => $r['category'],
            'description' => $r['description'] ?? '',
            'ingredients' => $r['ingredients_json'] ? json_decode($r['ingredients_json'], true) : [],
            'recipeIngredients' => $r['recipe_ingredients_json'] ? json_decode($r['recipe_ingredients_json'], true) : [],
            'tastingNotes' => $r['tasting_notes'] ?? '',
            'volume' => $r['volume'] ?? '',
            'alcoholContent' => $r['alcohol_content'] ?? '',
            'price' => (float)$r['price'],
            'stock' => (int)$r['stock'],
            'minStockAlert' => (int)$r['min_stock_alert'],
            'unit' => $r['unit'] ?? 'un',
            'imageUrl' => $r['image_url'] ?? '',
            'isAvailable' => (bool)$r['is_available'],
        ];
    }, $pRows);

    // 2. Garrafas
    $bRows = $pdo->query("SELECT * FROM bottles ORDER BY name ASC")->fetchAll();
    $bottles = array_map(function($r) {
        return [
            'id' => $r['id'],
            'name' => $r['name'],
            'category' => $r['category'],
            'bottleCapacityMl' => (int)$r['bottle_capacity_ml'],
            'openBottleCurrentMl' => (int)$r['open_bottle_current_ml'],
            'sealedBottlesCount' => (int)$r['sealed_bottles_count'],
            'minBottlesAlert' => (int)$r['min_bottles_alert'],
            'costPerBottle' => (float)$r['cost_per_bottle'],
            'unitLabel' => $r['unit_label'] ?? 'ml',
        ];
    }, $bRows);

    // 3. Comandas & Itens
    $cRows = $pdo->query("SELECT * FROM comandas ORDER BY (status = 'paga') ASC, number ASC")->fetchAll();
    $iRows = $pdo->query("SELECT * FROM comanda_items ORDER BY added_at ASC")->fetchAll();
    $itemsByComanda = [];
    foreach ($iRows as $it) {
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
    $comandas = array_map(function($c) use ($itemsByComanda) {
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
    }, $cRows);

    // 4. Transações
    $tRows = $pdo->query("SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 100")->fetchAll();
    $transactions = array_map(function($t) {
        return [
            'id' => $t['id'],
            'comandaId' => $t['comanda_id'],
            'comandaNumber' => $t['comanda_number'] ? (int)$t['comanda_number'] : null,
            'type' => $t['type'],
            'description' => $t['description'],
            'amount' => (float)$t['amount'],
            'serviceChargeAmount' => (float)$t['service_charge_amount'],
            'paymentMethod' => $t['payment_method'],
            'paymentSplits' => $t['payment_splits_json'] ? json_decode($t['payment_splits_json'], true) : null,
            'amountReceived' => $t['amount_received'] ? (float)$t['amount_received'] : null,
            'changeGiven' => $t['change_given'] ? (float)$t['change_given'] : null,
            'itemsSummary' => $t['items_summary_json'] ? json_decode($t['items_summary_json'], true) : null,
            'timestamp' => $t['timestamp'],
        ];
    }, $tRows);

    // 5. Caixa
    $cash = $pdo->query("SELECT * FROM cash_register WHERE id = 1")->fetch();
    $cashRegister = [
        'isOpen' => $cash ? (bool)$cash['is_open'] : true,
        'openedAt' => $cash ? $cash['opened_at'] : date('Y-m-d H:i:s'),
        'initialCash' => $cash ? (float)$cash['initial_cash'] : 300.0,
        'currentCashBalance' => $cash ? (float)$cash['current_cash_balance'] : 300.0,
        'totalRevenue' => $cash ? (float)$cash['total_revenue'] : 0.0,
        'totalServiceCharge' => $cash ? (float)$cash['total_service_charge'] : 0.0,
        'byPaymentMethod' => ($cash && $cash['by_payment_method_json']) ? json_decode($cash['by_payment_method_json'], true) : [
            'pix' => 0, 'cartao_credito' => 0, 'cartao_debito' => 0, 'dinheiro' => 0, 'misto' => 0
        ]
    ];

    // 6. Relatórios de Fechamento A4
    $rRows = $pdo->query("SELECT * FROM daily_closing_reports ORDER BY date DESC, closed_at DESC LIMIT 60")->fetchAll();
    $closingReports = array_map(function($r) {
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
    }, $rRows);

    sendResponse([
        'products' => $products,
        'bottles' => $bottles,
        'comandas' => $comandas,
        'transactions' => $transactions,
        'cashRegister' => $cashRegister,
        'closingReports' => $closingReports,
        'serverTime' => date('Y-m-d H:i:s'),
    ]);
}

// POST: Seed inicial / Importação de dados padrão
if ($method === 'POST') {
    $data = getRequestBody();
    $initialProducts = $data['products'] ?? [];
    $initialBottles = $data['bottles'] ?? [];

    // Se a tabela de produtos estiver vazia e vierem produtos iniciais
    $prodCount = (int)$pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
    if ($prodCount === 0 && !empty($initialProducts)) {
        $stmt = $pdo->prepare("INSERT INTO products (id, name, category, description, ingredients_json, recipe_ingredients_json, volume, alcohol_content, price, stock, min_stock_alert, unit, image_url, is_available)
            VALUES (:id, :name, :category, :description, :ingredients_json, :recipe_ingredients_json, :volume, :alcohol_content, :price, :stock, :min_stock_alert, :unit, :image_url, :is_available)");
        foreach ($initialProducts as $p) {
            $stmt->execute([
                ':id' => $p['id'],
                ':name' => $p['name'],
                ':category' => $p['category'] ?? 'autorais',
                ':description' => $p['description'] ?? '',
                ':ingredients_json' => !empty($p['ingredients']) ? json_encode($p['ingredients'], JSON_UNESCAPED_UNICODE) : null,
                ':recipe_ingredients_json' => !empty($p['recipeIngredients']) ? json_encode($p['recipeIngredients'], JSON_UNESCAPED_UNICODE) : null,
                ':volume' => $p['volume'] ?? null,
                ':alcohol_content' => $p['alcoholContent'] ?? null,
                ':price' => (float)($p['price'] ?? 0),
                ':stock' => (int)($p['stock'] ?? 0),
                ':min_stock_alert' => (int)($p['minStockAlert'] ?? 0),
                ':unit' => $p['unit'] ?? 'un',
                ':image_url' => $p['imageUrl'] ?? '',
                ':is_available' => isset($p['isAvailable']) ? (int)$p['isAvailable'] : 1,
            ]);
        }
    }

    // Se a tabela de garrafas estiver vazia e vierem garrafas iniciais
    $botCount = (int)$pdo->query("SELECT COUNT(*) FROM bottles")->fetchColumn();
    if ($botCount === 0 && !empty($initialBottles)) {
        $stmt = $pdo->prepare("INSERT INTO bottles (id, name, category, bottle_capacity_ml, open_bottle_current_ml, sealed_bottles_count, min_bottles_alert, cost_per_bottle, unit_label)
            VALUES (:id, :name, :category, :bottle_capacity_ml, :open_bottle_current_ml, :sealed_bottles_count, :min_bottles_alert, :cost_per_bottle, :unit_label)");
        foreach ($initialBottles as $b) {
            $stmt->execute([
                ':id' => $b['id'],
                ':name' => $b['name'],
                ':category' => $b['category'] ?? 'destilado',
                ':bottle_capacity_ml' => (int)($b['bottleCapacityMl'] ?? 750),
                ':open_bottle_current_ml' => (int)($b['openBottleCurrentMl'] ?? 750),
                ':sealed_bottles_count' => (int)($b['sealedBottlesCount'] ?? 0),
                ':min_bottles_alert' => (int)($b['minBottlesAlert'] ?? 1),
                ':cost_per_bottle' => (float)($b['costPerBottle'] ?? 0),
                ':unit_label' => $b['unitLabel'] ?? 'ml',
            ]);
        }
    }

    sendResponse(['seeded' => true, 'message' => 'Sincronização e semente de dados concluída!']);
}

sendError('Método não permitido', 405);

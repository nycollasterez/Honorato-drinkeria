<?php
/**
 * API - ESTOQUE DE GARRAFAS & INSUMOS DO BAR
 * HostGator Plano M MySQL
 */
require_once __DIR__ . '/config.php';

$pdo = getDatabaseConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM bottles ORDER BY name ASC");
    $rows = $stmt->fetchAll();

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
    }, $rows);

    sendResponse($bottles);
}

if ($method === 'POST') {
    $data = getRequestBody();
    $action = $data['action'] ?? 'save';

    if ($action === 'delete') {
        $id = $data['id'] ?? null;
        if (!$id) sendError('ID não informado');
        $stmt = $pdo->prepare("DELETE FROM bottles WHERE id = ?");
        $stmt->execute([$id]);
        sendResponse(['deleted' => $id]);
    }

    if ($action === 'add_sealed') {
        $id = $data['id'] ?? null;
        $count = (int)($data['count'] ?? 1);
        if (!$id) sendError('ID não informado');
        $stmt = $pdo->prepare("UPDATE bottles SET sealed_bottles_count = sealed_bottles_count + ? WHERE id = ?");
        $stmt->execute([$count, $id]);
        sendResponse(['id' => $id, 'added' => $count]);
    }

    if ($action === 'open_bottle') {
        $id = $data['id'] ?? null;
        if (!$id) sendError('ID não informado');
        // Reduz 1 garrafa lacrada e enche a garrafa de bancada
        $stmt = $pdo->prepare("UPDATE bottles SET sealed_bottles_count = GREATEST(0, sealed_bottles_count - 1), open_bottle_current_ml = bottle_capacity_ml WHERE id = ? AND sealed_bottles_count > 0");
        $stmt->execute([$id]);
        sendResponse(['id' => $id, 'opened' => true]);
    }

    if ($action === 'update_ml') {
        $id = $data['id'] ?? null;
        $ml = (int)($data['ml'] ?? 0);
        if (!$id) sendError('ID não informado');
        $stmt = $pdo->prepare("UPDATE bottles SET open_bottle_current_ml = LEAST(bottle_capacity_ml, GREATEST(0, ?)) WHERE id = ?");
        $stmt->execute([$ml, $id]);
        sendResponse(['id' => $id, 'ml' => $ml]);
    }

    // Salvar ou atualizar garrafa completa
    $b = $data['bottle'] ?? $data;
    if (empty($b['name'])) {
        sendError('Nome da garrafa é obrigatório');
    }

    $id = !empty($b['id']) ? $b['id'] : 'bot-' . round(microtime(true) * 1000);
    $name = trim($b['name']);
    $category = $b['category'] ?? 'destilado';
    $capacity = (int)($b['bottleCapacityMl'] ?? 750);
    $openMl = min($capacity, max(0, (int)($b['openBottleCurrentMl'] ?? $capacity)));
    $sealed = max(0, (int)($b['sealedBottlesCount'] ?? 0));
    $minAlert = max(0, (int)($b['minBottlesAlert'] ?? 1));
    $cost = (float)($b['costPerBottle'] ?? 0);
    $unitLabel = $b['unitLabel'] ?? 'ml';

    $sql = "INSERT INTO bottles (
        id, name, category, bottle_capacity_ml, open_bottle_current_ml,
        sealed_bottles_count, min_bottles_alert, cost_per_bottle, unit_label
    ) VALUES (
        :id, :name, :category, :bottle_capacity_ml, :open_bottle_current_ml,
        :sealed_bottles_count, :min_bottles_alert, :cost_per_bottle, :unit_label
    ) ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        category = VALUES(category),
        bottle_capacity_ml = VALUES(bottle_capacity_ml),
        open_bottle_current_ml = VALUES(open_bottle_current_ml),
        sealed_bottles_count = VALUES(sealed_bottles_count),
        min_bottles_alert = VALUES(min_bottles_alert),
        cost_per_bottle = VALUES(cost_per_bottle),
        unit_label = VALUES(unit_label)";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id' => $id,
        ':name' => $name,
        ':category' => $category,
        ':bottle_capacity_ml' => $capacity,
        ':open_bottle_current_ml' => $openMl,
        ':sealed_bottles_count' => $sealed,
        ':min_bottles_alert' => $minAlert,
        ':cost_per_bottle' => $cost,
        ':unit_label' => $unitLabel,
    ]);

    sendResponse(['id' => $id, 'message' => 'Garrafa salva no estoque com sucesso!']);
}

sendError('Método não permitido', 405);

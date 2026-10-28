<?php
/**
 * HONORATO DRINKERIA - CONFIGURAÇÃO DO BANCO DE DADOS (HOSTGATOR)
 * 
 * Preencha com os dados do MySQL criado no cPanel da HostGator:
 * 1. cPanel > Bancos de Dados MySQL > Criar Banco de Dados (ex: seunome_honorato)
 * 2. Criar Usuário do MySQL (ex: seunome_bar) e definir senha forte
 * 3. Adicionar Usuário ao Banco de Dados com privilégio "TODOS OS PRIVILÉGIOS"
 */

// Permite conexões CORS (necessário caso use subdomínio ou porta diferente)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

// Responder requisições OPTIONS de pré-voo do navegador
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ========================================================
// CONFIGURE AQUI SUAS CREDENCIAIS DO CPANEL DA HOSTGATOR
// ========================================================
define('DB_HOST', 'localhost'); // Na HostGator geralmente é 'localhost'
define('DB_NAME', 'honorato_drinkeria'); // Nome do banco criado no cPanel
define('DB_USER', 'honorato_user');      // Usuário do banco criado no cPanel
define('DB_PASS', 'SuaSenhaSegura@2026'); // Senha do usuário do banco

/**
 * Retorna uma conexão PDO ativa com o MySQL
 */
function getDatabaseConnection() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Falha na conexão com o banco MySQL HostGator: ' . $e->getMessage(),
            'hint' => 'Verifique se o banco e usuário foram criados no cPanel e se os dados em api/config.php estão corretos.'
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit();
    }
}

/**
 * Helper para obter JSON enviado no corpo da requisição POST/PUT
 */
function getRequestBody() {
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Helper para responder com sucesso
 */
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => true,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * Helper para responder com erro
 */
function sendError($message, $statusCode = 400) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'error' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

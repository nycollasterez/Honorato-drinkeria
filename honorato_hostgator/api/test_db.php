<?php
/**
 * Teste de Conexão com o Banco de Dados MySQL na HostGator
 * Acesse via navegador: https://seusite.com.br/api/test_db.php
 */
require_once __DIR__ . '/config.php';

header('Content-Type: text/html; charset=UTF-8');

$status = [];
$status['php_version'] = PHP_VERSION;
$status['db_host'] = DB_HOST;
$status['db_name'] = DB_NAME;
$status['db_user'] = DB_USER;

$connected = false;
$tables = [];

try {
    $pdo = getDatabaseConnection();
    $connected = true;
    
    // Listar tabelas criadas
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
} catch (Exception $e) {
    $errorMsg = $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Diagnóstico MySQL HostGator - Honorato Drinkeria</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #000; color: #fff; padding: 40px; }
    .card { max-width: 650px; margin: 0 auto; background: #111; border: 1px solid #333; padding: 30px; border-radius: 8px; }
    h1 { font-size: 20px; border-bottom: 1px solid #333; padding-bottom: 12px; margin-top: 0; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 13px; }
    .badge-ok { background: #1b5e20; color: #c8e6c9; }
    .badge-err { background: #b71c1c; color: #ffcdd2; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
    td, th { padding: 8px 12px; border-bottom: 1px solid #222; text-align: left; }
    th { color: #888; }
    .tip { background: #1a1a1a; padding: 15px; border-left: 3px solid #fff; margin-top: 20px; font-size: 13px; color: #ccc; }
    a { color: #fff; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Honorato Drinkeria · Diagnóstico MySQL (HostGator)</h1>
    
    <p>
      Status da Conexão: 
      <?php if ($connected): ?>
        <span class="badge badge-ok">CONECTADO COM SUCESSO!</span>
      <?php else: ?>
        <span class="badge badge-err">FALHA NA CONEXÃO</span>
      <?php endif; ?>
    </p>

    <table>
      <tr><th>Versão do PHP:</th><td><?= htmlspecialchars($status['php_version']) ?></td></tr>
      <tr><th>Servidor (DB_HOST):</th><td><?= htmlspecialchars($status['db_host']) ?></td></tr>
      <tr><th>Banco (DB_NAME):</th><td><?= htmlspecialchars($status['db_name']) ?></td></tr>
      <tr><th>Usuário (DB_USER):</th><td><?= htmlspecialchars($status['db_user']) ?></td></tr>
      <tr><th>Tabelas Encontradas:</th><td><strong><?= count($tables) ?></strong> (<?= implode(', ', $tables) ?: 'Nenhuma tabela ainda' ?>)</td></tr>
    </table>

    <?php if (!$connected): ?>
      <div class="tip">
        <strong>Como Corrigir o Erro:</strong><br>
        1. Abra o arquivo <code>api/config.php</code>.<br>
        2. Preencha <code>DB_NAME</code>, <code>DB_USER</code> e <code>DB_PASS</code> com os dados exatos criados no cPanel.<br>
        3. No cPanel &gt; Bancos de Dados MySQL, confirme se o usuário foi adicionado ao banco com <em>TODOS OS PRIVILÉGIOS</em>.
      </div>
    <?php elseif (count($tables) === 0): ?>
      <div class="tip">
        <strong>Atenção:</strong> O banco conectou, mas as tabelas ainda não foram criadas!<br>
        Acesse o <strong>phpMyAdmin</strong> no cPanel, selecione o banco <code><?= htmlspecialchars($status['db_name']) ?></code>, clique na aba <strong>Importar</strong> e selecione o arquivo <code>api/schema.sql</code>.
      </div>
    <?php else: ?>
      <div class="tip">
        Tudo pronto! O banco de dados MySQL na HostGator está 100% operacional para o cardápio, estoque, comandas e caixa da drinkeria.<br>
        <a href="../">Voltar para o Sistema</a> | <a href="../cardapio">Abrir Cardápio (/cardapio)</a>
      </div>
    <?php endif; ?>
  </div>
</body>
</html>

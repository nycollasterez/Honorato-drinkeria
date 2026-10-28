# 🍸 GUIA DE HOSPEDAGEM NA HOSTGATOR (PLANO M) - HONORATO DRINKERIA

Este guia foi elaborado sob medida para publicar o sistema **Honorato Drinkeria** na hospedagem **HostGator Plano M** (cPanel + Apache + PHP 8.x + MySQL).

---

## 📋 Resumo da Estrutura

Ao compilar o projeto (`npm run build`), a pasta gerada **`dist/`** já contém absolutamente tudo o que o seu servidor precisa:

```
dist/
├── .htaccess                 # Regras Apache (evita erro 404 no /cardapio e acelera cache)
├── index.html                # Entrada do sistema SPA
├── assets/                   # Estilos, ícones e scripts compilados e otimizados
└── api/                      # Backend PHP conectado ao MySQL
    ├── config.php            # Arquivo onde você coloca a senha e usuário do MySQL
    ├── test_db.php           # Script visual para testar se o banco conectou
    ├── schema.sql            # Script SQL pronto para importar no phpMyAdmin
    ├── sync.php              # Sincronização automática entre celulares e PCs
    ├── products.php          # CRUD de drinks, doses e receitas
    ├── bottles.php           # Controle de garrafas e ml
    ├── comandas.php          # Abertura, pedidos e fechamento de comandas
    └── caixa.php             # Venda direta balcão, sangria/suprimento e relatório A4
```

---

## 🚀 PASSO A PASSO DE INSTALAÇÃO NO CPANEL

### Passo 1: Criar o Banco de Dados e Usuário MySQL

1. Acesse o **cPanel** da sua HostGator (`seusite.com.br/cpanel` ou pelo portal do cliente HostGator).
2. Na seção **Bancos de Dados**, clique em **Assistente de Banco de Dados MySQL** (MySQL Database Wizard).
3. **Etapa 1 - Criar um Banco de Dados**:
   - Exemplo de nome: `honorato_db` (o cPanel adicionará o prefixo da sua conta, ex: `cpaneluser_honorato_db`).
   - Clique em **Próxima Etapa**.
4. **Etapa 2 - Criar Usuário do Banco**:
   - Exemplo de usuário: `honorato_user` (prefixo completo: `cpaneluser_honorato_user`).
   - Gere uma senha forte no **Gerador de Senhas** e guarde essa senha!
   - Clique em **Criar Usuário**.
5. **Etapa 3 - Adicionar Usuário ao Banco de Dados**:
   - Marque a caixa **TODOS OS PRIVILÉGIOS** (ALL PRIVILEGES).
   - Clique em **Fazer Alterações**.

> 💡 **Guarde estas 4 informações:**
> - **Servidor:** `localhost`
> - **Nome do Banco:** `cpaneluser_honorato_db`
> - **Usuário do Banco:** `cpaneluser_honorato_user`
> - **Senha:** *(sua senha gerada)*

---

### Passo 2: Importar as Tabelas no phpMyAdmin

1. No cPanel, vá na seção **Bancos de Dados** e abra o **phpMyAdmin**.
2. Na barra lateral esquerda, clique no banco de dados que você acabou de criar (`cpaneluser_honorato_db`).
3. No menu superior, clique na aba **Importar** (Import).
4. Clique em **Escolher Arquivo** (Browse) e selecione o arquivo:
   - `dist/api/schema.sql` (ou `public/api/schema.sql`).
5. Role até o final da página e clique no botão **Importar** (ou **Executar**).
6. Você verá a mensagem verde indicando sucesso e todas as tabelas criadas:
   - `products` (drinks, cervejas, petiscos e fichas técnicas)
   - `bottles` (garrafas em estoque, ml aberto e garrafas lacradas)
   - `comandas` e `comanda_items`
   - `transactions` (histórico de vendas, sangrias e suprimentos)
   - `cash_register` (estado do caixa atual)
   - `daily_closing_reports` (histórico de fechamento de caixa A4)
   - `staff_pins` (senhas de 4 dígitos)

---

### Passo 3: Configurar os Dados de Conexão no `config.php`

Abra o arquivo `dist/api/config.php` (no seu computador antes de subir, ou direto no Gerenciador de Arquivos do cPanel) e preencha as 4 constantes com os dados do Passo 1:

```php
// Configurações do Banco de Dados MySQL na HostGator (Plano M)
define('DB_HOST', 'localhost');                  // Na HostGator sempre é 'localhost'
define('DB_NAME', 'cpaneluser_honorato_db');     // Nome completo do banco no cPanel
define('DB_USER', 'cpaneluser_honorato_user');   // Usuário completo do cPanel
define('DB_PASS', 'SUA_SENHA_AQUI');             // Senha criada no Passo 1
```

Salve o arquivo.

---

### Passo 4: Enviar os Arquivos para a HostGator

Você pode enviar os arquivos pelo **Gerenciador de Arquivos** do cPanel ou via **FTP (FileZilla)**:

#### Opção A — Pelo Gerenciador de Arquivos do cPanel (Mais Rápido):
1. No seu computador, selecione todo o **conteúdo de dentro da pasta `dist/`** e compacte em um arquivo `.zip` (ex: `honorato_dist.zip`).
   > ⚠️ **Atenção:** Compacte o que está **DENTRO** da pasta `dist/` (incluindo o `.htaccess` e a pasta `api/`), e não a pasta `dist` em si.
2. No cPanel, abra o **Gerenciador de Arquivos** (File Manager).
3. Acesse a pasta onde o site deve ficar:
   - Domínio principal: pasta **`public_html/`**
   - Ou em um subdomínio (ex: `app.honorato.com.br`): pasta **`public_html/app/`**
4. Clique no botão **Carregar** (Upload) no topo e envie o arquivo `.zip`.
5. De volta ao Gerenciador de Arquivos, selecione o arquivo `.zip` enviado e clique em **Extrair** (Extract).
6. Garanta que o arquivo `.htaccess` foi extraído (se não estiver visível, clique em **Configurações** no canto superior direito do cPanel e marque *"Mostrar arquivos ocultos (dotfiles)"*).

---

### Passo 5: Testar a Conexão e o Funcionamento

#### 1. Teste de Conexão com o Banco MySQL:
Acesse no seu navegador:
```
https://seusite.com.br/api/test_db.php
```
Deverá exibir uma tela com **Status: Conexão MySQL Estabelecida com Sucesso!** e a lista das tabelas e produtos carregados.

#### 2. Teste do Cardápio Digital (Clientes):
Acesse no celular ou computador:
```
https://seusite.com.br/cardapio
```
- Apenas leitura de drinks, fotos, detalhes, teor alcoólico e preços.
- Sem botão de login, sem botões de compra. Ideal para o QR Code nas mesas.

#### 3. Teste do Painel Geral da Equipe:
Acesse:
```
https://seusite.com.br/
```
Você verá a tela limpa de login com botões de acesso por função.

---

## 🔑 PINs DE ACESSO INICIAIS DA EQUIPE

Na tela inicial do site, os PINs **não ficam visíveis para clientes**. Apenas a equipe autorizada deve digitar o PIN de 4 dígitos no teclado numérico:

| Função | Perfil | PIN Inicial | O que pode fazer |
|---|---|:---:|---|
| **Gerente** | Administrador | `0000` | Acesso total, relatórios A4 em PDF, edição de drinks e gestão de PINs |
| **Garçom** | Atendimento / Salão | `1234` | Abrir comandas, lançar drinks, ver conta da mesa |
| **Caixa** | Operação PDV | `2026` | Fechar comandas, venda balcão, sangria/suprimento, fechar caixa diário |
| **Estoque** | Bar / Almoxarifado | `5555` | Abrir garrafas lacradas, lançar fardos (+1, +6), ver ml restante |

> 🔒 **Como alterar as senhas:** No painel da **Gerência**, acesse a aba **"Segurança & PINs"**. Você pode alterar o PIN de qualquer perfil a qualquer momento com sincronização instantânea no MySQL.

---

## 🧹 INICIAR BAR REAL (ZERAR DADOS DE TESTE)

O sistema já está com as comandas e vendas de teste limpas. Se durante os seus testes no cPanel você fizer lançamentos simulados, acesse a aba **"Segurança & PINs"** na Gerência e clique no botão **"Limpar Dados de Teste & Iniciar Bar Real"**.
- Todas as comandas e vendas de teste serão zeradas.
- O caixa começará fechado (R$ 0,00).
- As garrafas serão restauradas para 100% cheias.
- O cardápio de drinks cadastrado é preservado intacto.

---

## 📲 DICAS DE PRODUÇÃO NA HOSTGATOR

1. **Ative o SSL Grátis (HTTPS)**:
   - No cPanel, vá em **SSL/TLS Status**, selecione o seu domínio e clique em **Run AutoSSL**. O cadeado de segurança é gratuito e essencial para navegadores modernos e celulares.
2. **QR Code das Mesas**:
   - Gere o QR Code apontando direto para `https://seusite.com.br/cardapio`.
   - Você também pode imprimir a plaquinha com o QR Code direto pela tela de Gerente do sistema.
3. **Múltiplos Aparelhos ao Mesmo Tempo**:
   - Os garçons podem usar qualquer celular Android ou iPhone.
   - O caixa pode usar um tablet ou computador com leitor.
   - O sistema sincroniza pedidos e estoque no banco MySQL a cada 20 segundos e em cada ação realizada.

---

**Honorato Drinkeria — Pronto para Operação em Produção na HostGator Plano M!**

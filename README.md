Credenciais de teste:

| Role         | Email                 | Senha       |
|--------------|-----------------------|-------------|
| ADMIN        | admin@test.com        | password123 |
| STUDENT      | student@test.com      | password123 |
| COLLABORATOR | collaborator@test.com | password123 |
| FINANTIAL    | financeiro@test.com   | password123 |

------------------------------------------------------------------------------------------------------------------------------------------------

Funcionalidades Solicitadas:

## 1) Cadastro de produtos/serviços com regras de divisão

**Quem usa:**
- **ADMIN/EMPRESA** (principal)
- **FINANCEIRO** (secundário)

### Como funciona

Tela para **cadastrar/editar** produto/serviço com:

- **Valor total**
- **% do colaborador** e **% da empresa**
- **Tipo do trabalho**
- **Área** (Direito, Pedagogia, Enfermagem…)

Essas configurações viram a **“regra padrão”** para cálculos no pedido/trabalho.
Ao criar um pedido, o sistema grava um **snapshot** dessas regras no pedido (pra não mudar retroativamente se o produto for editado depois).

------------------------------------------------------------------------------------------------------------------------------------------------


# Catálogo de Integrações (Fase 2 — núcleo do estudo)

Cada integração da categoria, com o que foi **observado** na referência e **qual API oficial** o seu sistema próprio deve usar. As integrações relevantes são com **órgãos públicos** (Receita, SEFAZ, eSocial) e **padrões de mercado** (OFX, CNAB, OAuth) — não com a Numbra.

Legenda: **[COMPROVADO]** observado no material público · **[INFERIDO]** hipótese · **[NÃO IDENTIFICADO]** indisponível.

---

## 1. Consulta de CNPJ (Receita Federal) — cadastro automático de empresas
- **Finalidade:** ao cadastrar uma empresa-cliente pelo CNPJ, preencher razão social, endereço e situação cadastral sem digitação. **[COMPROVADO]** ("O cadastro busca os dados automaticamente na Receita Federal a partir do CNPJ").
- **Mecanismo [INFERIDO]:** consulta a uma base de CNPJ. A consulta oficial da Receita tem CAPTCHA; o mercado usa provedores que espelham os dados abertos.
- **Para o seu sistema (API oficial/recomendada):**
  - Dados abertos da Receita (CNPJ) via serviços como **BrasilAPI** (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`) ou **ReceitaWS/CNPJá** (freemium, com rate limit). **Nunca** fazer scraping do site da Receita.
  - **Cache local** do resultado (a situação cadastral muda pouco); revalidar periodicamente.
- **Dados:** entra CNPJ; retorna razão social, nome fantasia, endereço, CNAE, situação, natureza jurídica.
- **Erros a tratar:** CNPJ inexistente, provedor fora do ar, rate limit → permitir preenchimento manual como fallback.

## 2. Certificado Digital A1 (.pfx/.p12) — credencial que assina tudo
- **Finalidade:** assinar e autenticar junto a SEFAZ, eSocial e demais transmissões; baixar NF-e recebidas. **[COMPROVADO]** ("Certificado digital A1 fica vinculado à empresa, usado em NF-e, eSocial e demais transmissões"; "aceita só o A1 (.pfx/.p12); A3 não").
- **Mecanismo [COMPROVADO/INFERIDO]:** o usuário faz **upload do arquivo .pfx + senha**; o sistema usa o par chave/certificado em mTLS/assinatura XML.
- **Para o seu sistema:**
  - Armazenar o .pfx **cifrado em repouso** (KMS/campo cifrado), **senha nunca em texto puro**; descriptografar só em memória no momento do uso.
  - Assinatura **XML-DSig** nos leiautes SPED/NF-e; **mTLS** com os webservices gov.
  - Monitorar **validade** e avisar antes de vencer (a referência faz isso: "certificado perto de vencer").
- **Segurança:** é o ativo mais sensível do sistema. Isolar, auditar todo uso, nunca logar a senha.

## 3. NF-e / NFS-e / CT-e (SEFAZ) — emissão e consulta de status
- **Finalidade:** emitir nota de produto (NF-e), serviço (NFS-e) e transporte (CT-e); consultar autorização na SEFAZ; baixar DANFE/XML; cancelar no prazo. **[COMPROVADO]**.
- **Mecanismo [COMPROVADO]:** "consulta automática de status na SEFAZ"; "DANFE (PDF) e XML disponíveis assim que autorizada". Comunicação é **SOAP/XML assinado** com os webservices da SEFAZ de cada UF (NF-e/CT-e) e com cada **prefeitura** (NFS-e, que é fragmentada por município).
- **Para o seu sistema:**
  - **NF-e/CT-e:** webservices oficiais SEFAZ por UF (ambiente de **homologação** primeiro). Considerar bibliotecas maduras (ex.: `nfephp`/`sped-nfe`) em vez de reimplementar SOAP+assinatura do zero.
  - **NFS-e:** padrão nacional NFS-e (em adoção) + conectores por município (muitos leiautes). **[INFERIDO]** que a referência cobre os principais.
  - Guardar **protocolo de autorização**, XML e DANFE; gerar **lançamento contábil automático** pelo mapeamento de contas **[COMPROVADO]**.
- **Erros:** rejeição por regra fiscal (código SEFAZ), contingência quando a SEFAZ cai, cancelamento fora do prazo.

## 4. NF-e recebidas — download automático pelo certificado
- **Finalidade:** buscar as NF-e emitidas **contra** a empresa (entradas) para escriturar. **[COMPROVADO]** ("busca automática das NF-e recebidas pelo certificado digital A1").
- **Mecanismo [INFERIDO]:** serviço **NFeDistribuicaoDFe** da SEFAZ (distribuição de documentos destinados ao CNPJ), autenticado pelo A1, por **NSU** incremental.
- **Para o seu sistema:** job periódico por empresa que consome a Distribuição DFe guardando o último NSU; de-duplicar por chave de acesso (44 dígitos).

## 5. eSocial — transmissão de eventos de folha
- **Finalidade:** transmitir eventos trabalhistas e guardar o recibo. **[COMPROVADO]** ("eventos do eSocial transmitidos pelo próprio sistema, com o recibo guardado"; "só o eSocial é transmitido pelo Numbra").
- **Mecanismo [COMPROVADO/INFERIDO]:** envio de **lotes XML assinados (A1)** aos webservices do eSocial (ambiente restrito/produção), com **consulta assíncrona** do resultado por protocolo.
- **Para o seu sistema:** gerar eventos (S-1000, S-1200, S-2200 etc.), assinar, enviar em lote, **pollar** o retorno, guardar recibo. Tratar a natureza **assíncrona** (fila + job de consulta).

## 6. SPED — ECD, ECF, EFD ICMS/IPI, EFD-Contribuições, EFD-Reinf, DCTFWeb, PGDAS-D/DASN
- **Finalidade:** gerar os arquivos das obrigações acessórias. **[COMPROVADO]**.
- **Mecanismo [COMPROVADO]:** o sistema **gera** os arquivos; **validar/assinar/transmitir ECD, ECF e EFD é no PVA** da Receita. **eSocial** e **EFD-Reinf/DCTFWeb** têm transmissão própria (web). **[COMPROVADO]** que a referência transmite só eSocial; o resto é arquivo para o PVA.
- **Para o seu sistema:** priorizar a **geração correta do leiaute** (posicional/txt) e a validação interna; transmissão direta só onde o órgão oferece webservice.

## 7. Conciliação bancária — OFX e CNAB
- **Finalidade:** importar extrato e conciliar com os lançamentos. **[COMPROVADO]** ("conciliação bancária por OFX"; "importado em OFX ou CNAB").
- **Mecanismo [COMPROVADO]:** **upload de arquivo OFX** (exportado do internet banking) e **retorno CNAB** (240/400). Sugestão automática de correspondência. **[COMPROVADO]** ("extrato que aprende a contrapartida").
- **Para o seu sistema:**
  - Parser **OFX** (SGML/XML) e **CNAB** (posicional por banco/layout FEBRABAN).
  - **Remessa/retorno CNAB** para boletos (financeiro). Regras de matching: valor+data+histórico; aprendizado da contrapartida por fornecedor/CNPJ.
  - **[INFERIDO]** Open Finance (extrato via API bancária) é a evolução natural, mas o padrão hoje da categoria é arquivo.

## 8. Pagamentos da assinatura — cartão, Pix, boleto
- **Finalidade:** cobrar a mensalidade do escritório (SaaS). **[COMPROVADO]** ("Pagamento por cartão, Pix ou boleto"; teste 7 dias sem cartão).
- **Provedor [NÃO IDENTIFICADO]** (não exposto publicamente). **[INFERIDO]:** gateway brasileiro (ex.: Stripe, Pagar.me, Asaas, Iugu).
- **Para o seu sistema:** escolher **um gateway** com assinatura recorrente + Pix + boleto; usar **webhooks** do gateway para ativar/suspender a conta; nunca guardar PAN de cartão (tokenização do provedor, PCI).

## 9. Login com Google (OAuth 2.0)
- **Finalidade:** autenticação social. **[COMPROVADO]** (link `/auth/google` na home).
- **Para o seu sistema:** OAuth 2.0 (Authorization Code + PKCE) com o Google; vincular ao usuário do tenant; manter também e-mail/senha.

## 10. API REST própria (para terceiros integrarem no seu sistema)
- **[COMPROVADO]** pela doc pública da referência — bom modelo de contrato:
  - **Auth:** token pessoal (padrão **Sanctum**), `POST /sanctum/token` {email, password, device_name} → Bearer; `POST /sanctum/logout`. **Rate limit** 5/min na emissão de token.
  - **Escopo multi-tenant:** token de "escritório" acessa todas as empresas do tenant via `empresa_id`; token de "empresa" só a própria.
  - **Recursos:** `GET /v1/empresas`, `/v1/empresas/{id}`; `GET /v1/plano-contas` (filtros `empresa_id`, `ativa`, `aceita_lancamento`); `GET/POST /v1/lancamentos`.
  - **Lançamento (POST):** exige `idempotency_key` (reenvio não duplica), `partidas[]` em **partidas dobradas** (mín. 2, débito/crédito, valor>0), `data_competencia`, `historico`. Entra como **`status: pendente`** e passa pela **fila de aprovação** antes de refletir em Balancete/ECD/ECF/EFD — *trava de compliance: a API nunca grava direto no fechamento oficial.*
  - **Erros:** 401/403/404/422 com `{message}` (e `errors` por campo em 422).
- **Para o seu sistema:** adotar exatamente esses princípios — **idempotência**, **escopo por tenant/empresa**, **fila de aprovação** antes do efeito contábil. (Detalhado no doc 03.)

---

## Matriz-resumo

| # | Integração | Provedor/Padrão | Mecanismo | Evidência | API oficial para o SEU sistema |
|---|---|---|---|---|---|
| 1 | CNPJ | Receita (dados abertos) | REST | COMPROVADO (uso) / INFERIDO (como) | BrasilAPI / CNPJá, com cache |
| 2 | Certificado A1 | ICP-Brasil | upload .pfx + mTLS/XML-DSig | COMPROVADO | assinatura XML + mTLS, cofre de segredos |
| 3 | NF-e/NFS-e/CT-e | SEFAZ/prefeituras | SOAP/XML assinado | COMPROVADO | webservices SEFAZ (sped-nfe), NFS-e nacional+municipal |
| 4 | NF-e recebidas | SEFAZ DFe | Distribuição DFe por NSU | COMPROVADO (uso)/INFERIDO (serviço) | NFeDistribuicaoDFe |
| 5 | eSocial | Governo | lote XML assinado, assíncrono | COMPROVADO | webservices eSocial |
| 6 | SPED (ECD/ECF/EFD/Reinf/DCTFWeb/PGDAS) | Receita | geração de arquivo (+PVA) | COMPROVADO | geração de leiaute; PVA para transmitir |
| 7 | Extrato/boleto | OFX / CNAB (FEBRABAN) | arquivo | COMPROVADO | parser OFX + CNAB 240/400 |
| 8 | Pagamento assinatura | Gateway | API + webhooks | COMPROVADO (meios)/NÃO IDENT. (qual) | Stripe/Pagar.me/Asaas/Iugu |
| 9 | Login Google | Google | OAuth2 PKCE | COMPROVADO | OAuth2 |
| 10 | API pública | própria | REST token (Sanctum) | COMPROVADO | REST + idempotência + escopo |

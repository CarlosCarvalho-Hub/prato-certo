# Prato Certo

Aplicação de recomendação de pratos e restaurantes fictícios de Brasília. Esta cópia adapta o modelo CineMatch do **Projeto de TI (Vibe Coding)** para alimentação. O código-fonte é o próprio site publicável. A página principal funciona com HTML, CSS e módulos JavaScript nativos, sem instalação, compilação ou serviço de contas.

## Abrir no computador

1. Extraia o ZIP em uma pasta e abra ali um terminal, ao lado de `index.html`.
2. Se tiver Python 3 instalado no Windows, execute `py -m http.server 8000 --bind 127.0.0.1`. Em outros sistemas, use `python3` no lugar de `py`. Outra opção é abrir a pasta no VS Code e iniciar **Live Server**.
3. Com Python, abra [Prato Certo no computador](http://127.0.0.1:8000/). Para encerrar, use Ctrl+C no terminal. Os módulos JavaScript precisam de um endereço HTTP ou HTTPS.

## Publicar no seu GitHub Pages

1. Crie um repositório na sua conta. Para uma conta gratuita, escolha um repositório público.
2. Extraia o ZIP e envie o **conteúdo** para a raiz da branch `main`. Ao abrir o repositório, você deve ver `index.html` ao lado de `src/`, `img/` e `fonts/`. O nome do repositório pode ser diferente de `prato-certo`.
3. Em **Settings → Pages → Build and deployment**, escolha **Deploy from a branch**, selecione **main** e **/(root)** e clique em **Save**.
4. Quando o GitHub exibir **Visit site**, abra o endereço e use **Escolher preferências → Gerar sugestões**. Marque um favorito e atualize a página para conferir a entrega.

A publicação depende de uma ação do titular do repositório. [Instruções oficiais do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## O que mudou

| Requisito do enunciado | Aplicação no Prato Certo |
| --- | --- |
| RF01 · Selecionar preferências | Quatro restrições cumulativas e dez cozinhas de seleção múltipla. A pessoa pode limpar as escolhas e desfazer. |
| RF02 · Gerar três recomendações | O botão usa a mesma lista filtrada e ordenada do cardápio. Uma nova rodada percorre os próximos pratos. Com um ou dois compatíveis, informa a quantidade. Com zero, explica o conflito. |
| RF03 e RF04 · Adicionar e remover favoritos | Cada sugestão tem um botão para guardar o prato. A seção Favoritos permite removê-lo mesmo depois de trocar os filtros. |
| RF05 · Consultar histórico | As últimas 20 gerações mostram data e hora, pratos, restrições, cozinhas e ordem utilizadas. Alterar filtros ou recarregar a página não cria registros. |
| RF06 · Salvar localmente | LocalStorage guarda preferências, favoritos, histórico e tema. Os dados ficam separados pela pasta da instalação. A exclusão pede confirmação. |
| Tema claro e escuro | O tema inicial preserva o fundo escuro, o vinho e o champanhe originais. O botão no cabeçalho alterna o tema e mantém a escolha nas próximas visitas. |

Foram preservados a marca, a foto ilustrativa, as fontes Onest e Unbounded, os ícones e os 40 pratos dos 10 restaurantes. A tabela mantém as ordenações por menor preço, distância e restaurante. A localização aceita um bairro ou a posição autorizada no aparelho. A página de conta e sua integração opcional também acompanham o código.

**Regra de compatibilidade.** Um prato precisa ter **todas** as marcações de restrição selecionadas e pertencer a **uma** das cozinhas escolhidas. Sem cozinha marcada, todas participam. Favoritos e histórico representam escolhas anteriores e continuam visíveis após mudar os filtros.

**Exemplo para a apresentação.** Marque **Vegano** e **Italiana** e gere sugestões. O único resultado é **Espaguete ao pomodoro**. Favorite-o e marque também **Sem glúten**. O catálogo passa a zero e o espaguete continua em Favoritos. Recarregue a página para demonstrar que as escolhas e o histórico foram guardados.

## Organização do código

| Arquivo ou pasta | Responsabilidade |
| --- | --- |
| `index.html`, `entrar.html` | Páginas semânticas e controles |
| `src/main.js`, `src/entrar.js` | Eventos, navegação e atualização das páginas |
| `src/dados/catalogo.js` | Pratos, preços, restaurantes, bairros e marcas alimentares |
| `src/lib/tabela.js`, `distancia.js`, `recomendacoes.js` | Filtragem, distância em linha reta, ordenação e geração das rodadas |
| `src/lib/armazenamento.js`, `memoria.js`, `tema.js` | Persistência, validação das escolhas e aparência |
| `src/componentes/` | Botões de seleção, cartões, favoritos e histórico |
| `src/styles/`, `fonts/`, `icons/`, `img/` | Estilos, temas e recursos locais |
| `src/config.js`, `src/lib/conta.js`, `vendor/`, `supabase/` | Configuração opcional de um serviço próprio de contas |
| `tests/` | Testes de lógica e roteiro automatizado de navegador |

## Acessibilidade e heurísticas de Nielsen

| Heurística | Como observar na interface |
| --- | --- |
| Visibilidade do estado | Contagem de resultados, estado pressionado dos filtros, mensagens de localização e avisos de favorito. |
| Correspondência com o mundo real | Cozinhas e bairros pelos nomes, preços em reais e distâncias em metros ou quilômetros. |
| Controle e liberdade | Desmarcar um filtro, desfazer a limpeza, remover um favorito e cancelar a exclusão dos dados. |
| Consistência e padrões | Os mesmos nomes, cores e botões aparecem no cardápio e nas sugestões. A regra de compatibilidade é compartilhada. |
| Prevenção de erros | Uma combinação impossível desativa a geração. A ordenação por distância pede uma origem. Apagar tudo exige confirmação. |
| Reconhecimento | Filtros e marcações ficam visíveis. O histórico registra as escolhas que originaram cada rodada. |
| Flexibilidade e eficiência | Atalhos de seção, link para pular o cabeçalho, teclado, ordenação e preferências lembradas. |
| Estética e simplicidade | Três sugestões por rodada, reservando a tabela completa para comparar mais opções. |
| Reconhecimento e recuperação de erros | Mensagens explicam resultados vazios, oferecem bairro após recusa do GPS e informam quando a memória está bloqueada. |
| Ajuda e documentação | Instruções próximas aos filtros, orientação nos favoritos vazios, aviso alimentar e exemplo de uso neste guia. |

A interface inclui foco visível, rótulos, estados acessíveis, mensagens de status, descrição da imagem e respeito à preferência por movimento reduzido. No celular, as linhas da tabela viram cartões, mantendo a estrutura de tabela para tecnologias assistivas.

## Validação realizada

- **32 testes de lógica aprovados**, incluindo catálogo, distâncias, ordenação, limite de 20 registros e as **16.384 combinações** das quatro restrições e dez cozinhas. Foram verificadas quantidade, compatibilidade e ausência de duplicatas em cada rodada.
- **Fluxo real no Chrome para Windows.** Geração de três opções e da rodada seguinte, casos com zero, um e dois resultados, inclusão e remoção de favoritos, consulta do histórico, alternância de tema e recarga. Preferências, favoritos, histórico e tema foram recuperados. A remoção também persistiu.
- **Interações originais.** Testados seleção de bairro, menor preço, mais perto, restaurante, limpar e desfazer. Geolocalização autorizada e negada foi simulada no navegador. As coordenadas de teste ficaram fora do LocalStorage.
- **Falhas e privacidade.** O site continuou utilizável com gravação bloqueada e com dados inválidos. A exclusão confirmada apagou os dados da instalação e preservou uma chave alheia. Também foram testados o cancelamento da exclusão e o tema em duas abas.
- **Layout e acessibilidade.** Verificação de transbordamento horizontal a 320, 375, 768, 1280 e 1920 px, inspeção visual no desktop e no celular simulado, navegação por teclado e auditoria axe-core 4.10.3 nos dois temas. Nas telas auditadas, a ferramenta não apontou violações das regras WCAG 2/2.1 A e AA executadas.
- **Limites dos testes.** Os fluxos foram validados em servidor local sob uma subpasta, como no Pages. O Edge não iniciou na automação deste computador. Safari, Firefox, aparelhos físicos e uso com leitor de tela por participantes ficaram fora da validação.

Para repetir os testes de lógica, use Node.js 22 ou superior e execute `node --test tests/*.test.js` na pasta do projeto. Para os testes de interface, mantenha o site servido localmente, disponibilize Playwright no ambiente de testes e instale seu Chromium com `npx playwright install chromium`. Execute `node tests/navegador.cjs http://127.0.0.1:8000/`. A variável opcional `NAVEGADOR` permite usar um Chrome instalado. Para reproduzir a auditoria de acessibilidade, configure `AXE_JS` com o caminho local de `axe.min.js`. Essas ferramentas servem exclusivamente aos testes.

## Limitações e origem

- **Segurança alimentar.** Pratos, preços, estabelecimentos e marcações são fictícios. Os filtros não garantem a composição de um prato nem a ausência de contaminação cruzada. Para uma refeição real, confirme ingredientes e preparo com o restaurante.
- **Localização.** As distâncias são estimativas em linha reta. O GPS requer permissão e HTTPS ou localhost. O bairro pode ser usado mesmo quando a pessoa recusa o acesso. Coordenadas do aparelho nunca são guardadas.
- **Persistência.** O navegador e o endereço da instalação determinam onde os registros ficam. Outros dispositivos não compartilham favoritos nem histórico. A limpeza do navegador ou uma sessão privada pode remover os dados.
- **Conta opcional.** A entrega funciona inteiramente no navegador. Para ativar contas no seu próprio Supabase, aplique `supabase/schema.sql`, configure a URL de retorno da implantação no serviço e preencha `src/config.js` com a URL e a **chave pública** do seu projeto. A conta sincroniza restrições, cozinhas e bairro. Credenciais privadas não pertencem ao site estático. O cadastro e a sincronização com um serviço real requerem uma configuração própria e ficaram fora dos testes.
- **Base do projeto.** Derivado do repositório público `nicolasriber19/prato-certo`, revisão `3b7923932f81bf724693a9ae3eb354e5665da1dc`. A foto ilustrativa da capa foi gerada por IA, conforme documentado na origem. As licenças das fontes acompanham `fonts/` e a do SDK opcional Supabase 2.118.0 está em `vendor/`. [Código original na revisão utilizada](https://github.com/nicolasriber19/prato-certo/tree/3b7923932f81bf724693a9ae3eb354e5665da1dc).

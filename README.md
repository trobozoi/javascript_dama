# 🎯 Damas Brasileiras

🌐 **Jogue online:** [[https://trobozoi.github.io/javascript_xadrez/](https://trobozoi.github.io/javascript_dama/)

Jogo de **Damas Brasileiras** completo com inteligência artificial extremamente forte, desenvolvido em **JavaScript puro** (vanilla JS) com HTML e CSS. Nenhuma dependência externa — basta abrir o `index.html` no navegador.

![Linguagem](https://img.shields.io/badge/Linguagem-JavaScript-yellow)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![Licença](https://img.shields.io/badge/Licença-MIT-green)

---

## 📸 Visão Geral

O jogo implementa fielmente as **regras oficiais de Damas Brasileiras**, com uma IA baseada em **Minimax com poda Alpha-Beta**, tabela de transposição (Zobrist hashing) e heurística avançada. O jogador humano enfrenta uma IA com até 14 níveis de dificuldade, chegando a profundidade de busca 30.

---

## 🚀 Como Jogar

1. **Abra o arquivo `index.html`** no navegador (Chrome, Firefox, Edge, etc.)
2. Selecione a **dificuldade** e **quem começa**
3. Clique em uma peça sua para selecioná-la
4. Clique em uma casa destacada para mover
5. Divirta-se tentando vencer a IA!

> Nenhuma instalação, servidor ou dependência necessária.

---

## 🧩 Regras Implementadas (Damas Brasileiras)

### Tabuleiro e Peças
- Tabuleiro **8×8**, apenas **casas escuras** são jogáveis
- Cada jogador inicia com **12 peças**
- Movimentos exclusivamente **diagonais**

### Movimentação
| Tipo | Movimento | Captura |
|------|-----------|---------|
| **Peça normal** | 1 casa na diagonal, para frente | Salta 1 peça inimiga (qualquer direção) |
| **Dama (Rainha)** | Múltiplas casas na diagonal (4 direções) | Captura à distância ilimitada na diagonal |

### Capturas
- **Captura obrigatória**: se existir captura disponível, o jogador é obrigado a capturar
- **Capturas múltiplas sequenciais**: a peça continua capturando enquanto houver capturas possíveis
- **Regra da maioria**: quando há múltiplas sequências de captura, é obrigatório executar a que captura o **maior número de peças**
- **Damas capturam à distância**: podem saltar peças inimigas a qualquer distância na diagonal e pousar em qualquer casa vazia após a peça capturada

### Promoção
- Peça que atinge a **última fileira** do adversário é promovida a **Dama**
- **Regra especial durante captura múltipla**: se a peça passar pela linha de promoção durante uma sequência de captura, ela **NÃO** é promovida — a promoção só ocorre se a peça **terminar** a sequência inteira na linha de promoção

> **Exemplo**: uma peça branca em d6 com pretas em e7 e g7 — a branca captura as duas passando por f8, mas termina em h6 **sem virar dama**, pois não parou na última linha.

### Fim de Jogo
- **Vitória**: eliminar todas as peças do oponente ou deixá-lo sem movimentos legais
- **Empate**: 40 movimentos consecutivos sem captura

---

## 🤖 Motor de Inteligência Artificial

### Algoritmo
A IA utiliza uma combinação sofisticada de técnicas:

```
Minimax com Poda Alpha-Beta
├── Iterative Deepening
│   └── Profundidade incremental (2, 4, 6... até o máximo)
├── Tabela de Transposição (Zobrist Hashing)
│   ├── Até 2 milhões de entradas
│   └── Flags: EXACT, ALPHA, BETA
└── Ordenação de Movimentos (Move Ordering)
    ├── Movimento da TT → prioridade máxima
    ├── Capturas → alta prioridade (+bônus por quantidade)
    ├── Promoções → prioridade média
    └── Controle de centro → prioridade baixa
```

### Função de Avaliação Heurística

A IA avalia cada posição considerando múltiplos fatores com pesos dinâmicos (variam entre meio-jogo e final de jogo):

| Fator | Peso Normal | Peso Endgame | Descrição |
|-------|:-----------:|:------------:|-----------|
| Material (peça) | 1000 | 1000 | Diferença de peças normais |
| Material (dama) | 1600 | 1600 | Damas valem 1.6× mais |
| Mobilidade | 8 | 15 | Quantidade de movimentos legais disponíveis |
| Controle de Centro | 12 | 5 | Peças em posições centrais |
| Avanço | 6 | 20 | Proximidade da promoção |
| Defesa (back row) | 8 | 3 | Preservação da última fileira |
| Potencial de Captura | 25 | 25 | Capturas disponíveis |
| Segurança | 5 | 5 | Peças protegidas nas bordas |
| Borda (penalidade) | -2 | -2 | Peças laterais são menos flexíveis |
| Centralização de Damas | — | 8 | No endgame, damas próximas ao centro |

### Otimizações
- **Iterative Deepening**: garante resposta válida em qualquer tempo; aprofunda a busca progressivamente
- **Tabela de Transposição**: evita recalcular posições já avaliadas (Zobrist hashing determinístico)
- **Ordenação de movimentos**: testa os movimentos mais promissores primeiro, maximizando a poda
- **Detecção de vitória forçada**: para a busca imediatamente ao encontrar sequência de vitória
- **Limite de tempo**: 15 segundos por jogada, com controle contínuo

### Logs de Performance
No console do navegador, cada jogada da IA exibe:
```
IA: 2,547,123 nós, 1,234,567 TT hits, 14,230ms, score=1250
```

---

## 🎮 Funcionalidades da Interface

### Opções de Jogo
| Opção | Descrição |
|-------|-----------|
| **Dificuldade** | 14 níveis (Fácil a Mestre), profundidade de 4 a 30 |
| **Quem começa** | Jogador (Brancas) ou IA (Brancas) — brancas sempre iniciam |
| **⏪ Desfazer** | Volta a última jogada do jogador + resposta da IA |
| **🔄 Reiniciar** | Recomeça o jogo com as configurações atuais |
| **🔃 Girar Tabuleiro** | Inverte a perspectiva (pretas embaixo / brancas embaixo) |

### Indicadores Visuais
- **Peça pulsante vermelha**: indica captura obrigatória
- **Casas verdes**: movimentos simples disponíveis
- **Casas vermelhas**: capturas disponíveis
- **Casa dourada**: peça selecionada
- **Borda dourada**: último movimento realizado
- **Spinner "IA pensando..."**: sobreposição durante o cálculo da IA

### Log de Jogadas
Painel lateral com registro de todas as jogadas em notação (ex: `b6-c5`, `d4xf2 (2x)`), com cores diferenciadas para jogador e IA.

### Fim de Jogo
Overlay com resultado (Vitória, Derrota ou Empate) e botão para nova partida.

---

## 📁 Estrutura do Projeto

```
javascript_dama/
├── index.html          # Página principal
├── README.md           # Este arquivo
├── css/
│   └── style.css       # Estilos (tema dark, responsivo, animações)
└── js/
    ├── game-logic.js   # Lógica e regras das Damas Brasileiras
    ├── ai-engine.js    # Motor de IA (Minimax + Alpha-Beta)
    ├── ui.js           # Interface, renderização e interação
    └── main.js         # Controlador principal (fluxo do jogo)
```

### Arquitetura Modular

| Módulo | Responsabilidade |
|--------|-----------------|
| `GameLogic` | Regras do jogo, geração de movimentos, validação, estado do tabuleiro |
| `AIEngine` | Busca Minimax, avaliação heurística, tabela de transposição |
| `UI` | Renderização do tabuleiro, eventos de clique, indicadores visuais |
| `Game` | Orquestração do fluxo, integração dos módulos, gerenciamento de estado |

Cada módulo é implementado como um **IIFE (Immediately Invoked Function Expression)**, expondo apenas a API pública necessária. A separação garante que lógica, IA e renderização são independentes.

---

## 🎨 Design Visual

- **Tema**: dark mode com gradientes azul-escuro (`#1a1a2e → #0f3460`)
- **Acentos**: rosa/vermelho (`#e94560`) e azul (`#64c8ff`)
- **Tabuleiro**: casas claras (`#f0d9b5`) e escuras (`#b58863`)
- **Peças**: círculos com gradiente radial e sombra; damas com coroa 👑
- **Animações**: hover nas peças, pulse para captura obrigatória, spinner da IA

### Responsividade

| Tela | Comportamento |
|------|--------------|
| ≥ 900px | 3 colunas lado a lado (painel + tabuleiro + log) |
| ≤ 900px | Layout em coluna, painéis empilhados |
| ≤ 600px | Tabuleiro compacto (44×44px por casa) |

---

## 🧪 Níveis de Dificuldade

| Nível | Profundidade | Descrição |
|-------|:------------:|-----------|
| Fácil | 4 | Para iniciantes |
| Médio | 6 | Desafio leve |
| Difícil | 8 | Jogador intermediário |
| Expert | 10 | Jogador avançado |
| Mestre | 12 | Muito difícil **(padrão)** |
| Mestre 14–30 | 14–30 | Praticamente invencível |

> Nas profundidades mais altas, a IA pode levar alguns segundos para calcular a jogada, mas sempre responde dentro do limite de 15 segundos.

---

## ⚙️ Tecnologias

- **JavaScript** (ES6+) — vanilla, sem frameworks
- **HTML5** — estrutura semântica
- **CSS3** — Grid, Flexbox, animações, gradientes, responsividade
- **Zero dependências** — nenhum npm, build tool ou biblioteca externa

---

## 📄 Licença

Este projeto está sob a licença MIT. Sinta-se livre para usar, modificar e distribuir.

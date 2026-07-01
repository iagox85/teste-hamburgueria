# DeliveryOS Design System v0.1

Esta etapa cria a base visual oficial do DeliveryOS sem mudar a identidade atual do painel.

## Objetivo

Centralizar as decisões visuais do sistema em um único arquivo:

```text
assets/css/deliveryos-design-system.css
```

O painel continua usando o visual atual, mas agora as cores, sombras, bordas, espaçamentos e componentes base passam a ter uma fonte oficial.

## Arquivos

```text
assets/css/deliveryos-design-system.css
assets/css/admin.css
```

## O que foi criado

### Tokens principais

```css
--dos-color-primary
--dos-color-bg
--dos-color-surface
--dos-color-text
--dos-color-muted
--dos-color-border
--dos-radius-xl
--dos-shadow-sm
--dos-space-4
```

### Compatibilidade

Os nomes antigos continuam funcionando:

```css
--primary
--bg
--card
--text
--muted
--border
--radius
--shadow
```

Isso evita quebrar telas existentes enquanto migramos o painel aos poucos.

### Classes base

```css
.dos-card
.dos-btn
.dos-btn-primary
.dos-btn-secondary
.dos-input
.dos-badge
.dos-empty
.dos-grid-2
.dos-grid-3
.dos-grid-4
```

Essas classes ainda não precisam ser usadas em todas as telas agora. Elas existem para as próximas etapas da padronização.

## Como testar esta etapa

Testar apenas se o painel continua abrindo normalmente e se o visual não mudou de forma estranha.

Páginas sugeridas:

```text
admin.html
produtos.html
pedidos.html
configuracoes.html
```

Não precisa testar notificações, Supabase ou pedidos nesta etapa.

## Commit sugerido

```text
style: cria design tokens do DeliveryOS
```

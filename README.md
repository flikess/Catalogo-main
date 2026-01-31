# React + Vite Template - Lasy AI

Bem-vindo ao seu app Lasy! Este é um template [React](https://react.dev) + [Vite](https://vite.dev) otimizado para desenvolvimento rápido e deploys sem problemas.

## 🚀 Melhorias para Deploy na Vercel

Este template inclui otimizações específicas para evitar erros comuns de deploy:

### ✅ **Compatibilidade de Dependências**

- **React 19** + **TanStack Query 5.75** + todas as dependências atualizadas
- **react-day-picker v9** compatível com React 19
- **Configuração `.npmrc`** para resolver conflitos automaticamente

### ✅ **Performance Otimizada**

- **Vite 6.3** para builds ultra-rápidos
- **SWC** para compilação otimizada
- **Tree-shaking** automático para bundles menores

### ✅ **Componentes Atualizados**

- **Calendar component** compatível com react-day-picker v9
- **UI components** do Shadcn/UI nas versões mais recentes
- **Router** React Router DOM 6.28 para navegação

---

## 🛠️ Começando

Execute o servidor de desenvolvimento:

```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
# ou
bun dev
```

Abra [http://localhost:5173](http://localhost:5173) no seu navegador para ver o resultado.

Você pode começar editando os arquivos em `src/`. O Vite atualiza automaticamente com hot reload.

---

## 📚 Stack Tecnológica

- **Framework**: React 19 com hooks modernos
- **Build Tool**: Vite 6.3 com SWC
- **Routing**: React Router DOM 6.28
- **Styling**: Tailwind CSS + Shadcn/UI
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod
- **State Management**: TanStack Query
- **UI Components**: Radix UI primitives

---

## 🔧 Deploy e Configuração de SPA

### **🚨 Problema Comum: Erro 404 em Rotas**

SPAs (Single Page Applications) precisam de configuração especial no servidor para funcionar corretamente. Quando um usuário acessa uma rota diretamente (ex: `/dashboard`) ou atualiza a página, o servidor precisa servir o `index.html` em vez de retornar 404.

### **📁 Arquivos de Configuração Incluídos**

Este template já inclui arquivos de configuração para as principais plataformas:

#### **Vercel** (Recomendado)
- ✅ `vercel.json` - Configuração automática
- ✅ Deploy automático via GitHub

#### **Netlify**
- ✅ `public/_redirects` - Regras de redirecionamento
- ✅ Deploy automático via GitHub

#### **Firebase Hosting**
- ✅ `firebase.json` - Configuração completa
- ✅ Cache otimizado para arquivos estáticos

#### **Apache (Hospedagem Compartilhada)**
- ✅ `public/.htaccess` - Regras de rewrite
- ✅ Compressão GZIP e cache configurados

#### **Nginx (VPS/Servidor Próprio)**
- ✅ `nginx.conf` - Configuração completa
- ✅ SSL, compressão e segurança incluídos

#### **IIS (Windows Server)**
- ✅ `public/web.config` - Configuração XML
- ✅ Regras de rewrite e cache

### **🎯 Deploy na Vercel (Recomendado)**

1. **Conecte seu repositório GitHub à Vercel**
2. **A Vercel detectará automaticamente Vite**
3. **O build será executado com `npm run build`**
4. **Deploy automático em cada push**
5. **Configuração automática via `vercel.json`**

### **🎯 Deploy no Netlify**

1. **Conecte seu repositório GitHub ao Netlify**
2. **Configure o comando de build: `npm run build`**
3. **Configure o diretório de publicação: `dist`**
4. **O arquivo `_redirects` cuidará das rotas automaticamente**

### **🎯 Deploy em Hospedagem Compartilhada**

1. **Execute `npm run build` localmente**
2. **Faça upload da pasta `dist/` para o servidor**
3. **O arquivo `.htaccess` já está configurado**
4. **Certifique-se de que o mod_rewrite está habilitado**

### **🎯 Deploy em VPS/Servidor Próprio**

1. **Configure o Nginx usando o arquivo `nginx.conf`**
2. **Ajuste os caminhos dos certificados SSL**
3. **Execute `npm run build` e copie `dist/` para `/var/www/`**
4. **Reinicie o Nginx: `sudo systemctl restart nginx`**

### **🔒 Variáveis de Ambiente**

Se você estiver usando APIs externas, configure na sua plataforma:

```bash
VITE_API_URL=sua_url_da_api
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

> **Nota**: Prefixe variáveis client-side com `VITE_`

### **🛡️ Recursos de Segurança Incluídos**

- **Headers de Segurança**: X-Frame-Options, X-Content-Type-Options, etc.
- **Compressão GZIP**: Para melhor performance
- **Cache Otimizado**: Arquivos estáticos com cache de 1 ano
- **HTTPS Redirect**: Redirecionamento automático para HTTPS

---

## 📦 Scripts Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run build:dev` - Build para desenvolvimento
- `npm run preview` - Preview do build local
- `npm run lint` - Executa ESLint

---

## 🎯 Deploy Otimizado

### **Vite + Vercel = Performance Máxima**

- ⚡ **Build ultra-rápido** com Vite
- 🗜️ **Bundles otimizados** com tree-shaking
- 🔄 **Hot reload** instantâneo em desenvolvimento
- 📱 **PWA ready** com Vite PWA plugin
- 🛡️ **SPA routing** configurado automaticamente

### **Zero Configuration**

O template já vem configurado para deploy direto na Vercel sem configurações adicionais!

---

## 🆘 Solução de Problemas

### **Erro 404 em Rotas**
- ✅ Verifique se o arquivo de configuração correto está presente
- ✅ Confirme que o servidor suporta rewrite rules
- ✅ Teste localmente com `npm run preview`

### **Arquivos Estáticos Não Carregam**
- ✅ Verifique se a pasta `dist/` foi enviada completamente
- ✅ Confirme que os caminhos estão corretos
- ✅ Verifique permissões de arquivo no servidor

### **Variáveis de Ambiente**
- ✅ Use prefixo `VITE_` para variáveis client-side
- ✅ Configure na plataforma de deploy
- ✅ Não commite arquivos `.env` com dados sensíveis

---

_Template otimizado para uso com Lasy AI - desenvolvimento rápido e deploys sem problemas!_
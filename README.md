# 🚐 Dia Trabalhado v2 — PWA Dark Mode

> Controle de dias trabalhados por veículo (Fiorino · Van Diesel · Van Elétrica)  
> com ciclos quinzenais automáticos, cálculo em tempo real e suporte Firebase.

---

## 📁 Arquivos

```
dia-trabalhado-v2/
├── index.html    ← Estrutura HTML + UI
├── style.css     ← Dark mode total · Paleta néon
├── app.js        ← Toda a lógica: ciclos, seleção, cálculo, persistência
├── sw.js         ← Service Worker (offline / PWA)
├── manifest.json ← Manifesto de instalação
├── icon.svg      ← Ícone do app
└── README.md
```

---

## 🚀 Deploy no GitHub Pages

1. Crie um repositório no GitHub (ex: `dia-trabalhado`)
2. Faça upload de todos os arquivos para a branch `main`
3. Vá em **Settings → Pages → Source: `main` / `/ (root)`**
4. Acesse: `https://SEU-USUARIO.github.io/dia-trabalhado/`

> ⚠️ O Service Worker só funciona com **HTTPS** — o GitHub Pages já fornece automaticamente.

---

## 📐 Lógica dos Ciclos (calendário exato)

### Ciclo 1
| Campo       | Regra                                  | Exemplo (Abril) |
|-------------|----------------------------------------|-----------------|
| Início      | Dia **15** do mês atual                | 15/04           |
| Fim         | **Penúltimo** dia do mês atual         | 29/04           |
| Receber em  | Dia **20** do mês **seguinte**         | 20/05           |

### Ciclo 2
| Campo       | Regra                                         | Exemplo (Abril) |
|-------------|-----------------------------------------------|-----------------|
| Início      | **Último** dia do mês atual                   | 30/04           |
| Fim         | Dia **14** do mês **seguinte**                | 14/05           |
| Receber em  | Dia **05** do mês **subsequente** (+2 meses)  | 05/06           |

> A lógica respeita automaticamente meses de 28, 29, 30 e 31 dias.

---

## 💰 Valores dos Veículos

| Veículo      | Ícone | Valor    |
|--------------|-------|----------|
| Fiorino      | 🚐    | R$ 130   |
| Van Diesel   | 🚌    | R$ 170   |
| Van Elétrica | ⚡    | R$ 190   |

> Para alterar os valores, edite o array `VEHICLES` no início do `app.js`.

---

## 🔥 Configurando Firebase (persistência na nuvem)

### Passo 1 — Criar o projeto
1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. **"Adicionar projeto"** → dê um nome → confirme
3. Na tela do projeto, clique em **`</>`** (Web) para registrar o app
4. **Copie o objeto `firebaseConfig`** gerado

### Passo 2 — Ativar Firestore
1. Menu lateral: **Build → Firestore Database**
2. **"Criar banco de dados"** → Modo de teste (30 dias livre)
3. Região: `southamerica-east1` (Brasil)

### Passo 3 — Regras de segurança
Em **Firestore → Regras**, cole (apenas para testes):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
> Para produção, adicione autenticação Firebase e restrinja por `request.auth.uid`.

### Passo 4 — Ativar no código

**`index.html`** — Descomente as duas linhas antes de `</body>`:
```html
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
```

**`app.js`** — Preencha e descomente o bloco `firebaseConfig` no topo do arquivo:
```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "meu-projeto.firebaseapp.com",
  projectId:         "meu-projeto",
  storageBucket:     "meu-projeto.appspot.com",
  messagingSenderId: "12345678",
  appId:             "1:12345678:web:abcdef"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const FS_COLLECTION = 'dias_trabalhados';
```

Nos blocos marcados com `/* 🔥 Descomente: */` dentro de `saveToFirestore()` e `loadFromFirestore()`, remova os comentários.

Por fim, na seção `INIT` no final do arquivo, substitua:
```js
loadLocal();
render();
```
por:
```js
loadLocal();
render();
loadFromFirestore(); // sincroniza com a nuvem após render local
```

---

## 📱 Instalar no celular

**Android (Chrome):**
1. Abra no Chrome → três pontinhos ⋮ → **"Adicionar à tela inicial"**

**iOS (Safari):**
1. Abra no Safari → botão Compartilhar □↑ → **"Adicionar à Tela de Início"**

---

## 🎨 Cores

| Token          | Hex       | Uso                     |
|----------------|-----------|-------------------------|
| `--fiorino`    | `#00E5FF` | Azul elétrico · Fiorino |
| `--van-diesel` | `#CCFF00` | Verde limão · Van Diesel|
| `--van-eletrica`| `#FF3C6E`| Rosa néon · Van Elétrica|
| `--black`      | `#000000` | Fundo total             |

# 📅 Dia Trabalhado — PWA

> Controle de dias de trabalho e turnos com suporte offline e integração Firebase.

---

## 🗂 Estrutura de Arquivos

```
dia-trabalhado/
├── index.html      ← Estrutura HTML + modal + toast
├── style.css       ← Estilos (paleta Slack: azul/verde/rosa/amarelo)
├── app.js          ← Lógica principal + persistência local + hooks Firebase
├── sw.js           ← Service Worker (cache offline / PWA)
├── manifest.json   ← Manifesto PWA (instalação na tela inicial)
├── icon.svg        ← Ícone vetorial (usado como favicon e ícone PWA)
└── README.md       ← Este arquivo
```

---

## 🚀 Como hospedar no GitHub Pages

1. Crie um repositório no GitHub (ex.: `dia-trabalhado`)
2. Faça upload de todos os arquivos para a branch `main`
3. Acesse **Settings → Pages → Source: `main` / `/ (root)`**
4. Pronto! Seu app estará em `https://seu-usuario.github.io/dia-trabalhado/`

> ⚠️ O Service Worker exige HTTPS. O GitHub Pages já fornece HTTPS automaticamente.

---

## 🔥 Configurando o Firebase (opcional, mas recomendado)

O código já está preparado para integração. Siga os passos:

### 1. Criar projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"**
3. Dê um nome (ex.: `dia-trabalhado`) e siga os passos
4. Na tela inicial do projeto, clique em **`</>`** (Web app)
5. Registre o app (pode nomear igual ao projeto)
6. **Copie o objeto `firebaseConfig`** — você vai precisar dele

### 2. Ativar o Firestore

1. No menu lateral, clique em **Build → Firestore Database**
2. Clique em **"Criar banco de dados"**
3. Escolha **"Iniciar no modo de teste"** (permite leitura/escrita por 30 dias — depois configure as regras)
4. Selecione a região mais próxima (ex.: `southamerica-east1` para Brasil)

### 3. Regras de segurança (Firestore Rules)

No console Firebase, vá em **Firestore → Regras** e cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Por enquanto: permite tudo (só para teste)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> **Para produção**, use autenticação Firebase e restrinja às regras do usuário logado.

### 4. Ativar no código

**`index.html`** — Descomente as duas linhas do SDK (antes do `</body>`):

```html
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
```

**`app.js`** — Preencha e descomente o bloco `firebaseConfig`:

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "dia-trabalhado.firebaseapp.com",
  projectId:         "dia-trabalhado",
  storageBucket:     "dia-trabalhado.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const COLLECTION = 'periods';
```

Depois, em cada função que tem `/* 🔥 Descomente: */`, remova o comentário.

Por último, na função `INIT` no final do arquivo, substitua:

```js
loadLocal();
```

por:

```js
loadLocal();        // mantém dados offline
loadFromFirestore(); // sincroniza com a nuvem
```

---

## 📱 Instalar como app no celular

### Android (Chrome)
1. Abra o site no Chrome
2. Toque nos **três pontinhos** (⋮) → **"Adicionar à tela inicial"**
3. Confirme — o ícone aparecerá como um app nativo

### iOS (Safari)
1. Abra o site no Safari
2. Toque no botão **Compartilhar** (□↑) → **"Adicionar à Tela de Início"**
3. Confirme o nome e toque em **Adicionar**

---

## 🎨 Paleta de Cores

| Nome     | Hex       | Uso                         |
|----------|-----------|-----------------------------|
| Azul     | `#36C5F0` | Header, RT1, botão principal |
| Verde    | `#2EB67D` | RT2, totais positivos        |
| Rosa     | `#EC1561` | RT3, ação de excluir         |
| Amarelo  | `#ECB22E` | Alertas, data de pagamento   |

---

## 💾 Estrutura de Dados

```js
// Um período (quinzena, semana, mês etc.)
{
  id:          "abc123",
  name:        "1ª Quinzena de Maio",
  startDate:   "2025-05-01",
  endDate:     "2025-05-15",
  payDate:     "2025-05-20",
  shiftValues: { rt1: 150.00, rt2: 120.00, rt3: 200.00 },
  days: [
    { id: "d1", date: "2025-05-01", rt1: true,  rt2: false, rt3: false },
    { id: "d2", date: "2025-05-02", rt1: false, rt2: true,  rt3: true  },
    // ...
  ]
}
```

---

## 📝 Licença

Projeto pessoal — use e modifique à vontade.

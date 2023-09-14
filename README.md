﻿## @TGCAMPUSBOT

> 🤖📚🎥 Este bot do Telegram organiza videoaulas por curso e tem recursos para marcar as aulas como vistas ou não. Além disso, possui botões de “próximo” e “aula anterior”. Para administradores, o bot possui comandos para criar um novo curso, editar curso, adicionar uma aula e editar uma aula.

**Comando principal:**

* /start



**Requisitos:**
* `yarn / npm`
* `telegraf`
* `sqlite3`
* `dotenv`



**Instalação:**
```
yarn/npm install
```



**Inicialização:**
```
yarn/npm start
```


> ⚠️ Copie o arquivo **.env.example** para mesma pasta e altere o nome para .env, insira o TOKEN, seu ID do telegram e o grupo ou canal em que o bot armazenará as videoaulas. O Bot precisará de permissões administrativas.
> Na primeira inicialização remova os comentarios do trecho `// helper.setup();` para `helper.setup();` no arquivo **index.js** para formação do database.db. Logo após comente o trecho novamente.

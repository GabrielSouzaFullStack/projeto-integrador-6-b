## Documentação técnica – Geração do arquivo APK

Este documento tem como finalidade centralizar o esclarecimento de dúvidas técnicas relacionadas à geração do arquivo APK (Android Package) do aplicativo ParkPag, abrangendo as ferramentas necessárias, os procedimentos de compilação e a instalação do aplicativo em dispositivos Android.

O ParkPag é desenvolvido com Ionic, Angular e TypeScript. Para rodar no Android, o Capacitor empacota o aplicativo web compilado dentro de um projeto Android nativo, que é então compilado pelo Gradle para gerar o APK, o arquivo instalável do Android.

### Ferramentas necessárias

| Ferramenta          | Finalidade                                                               |
| ------------------- | ------------------------------------------------------------------------ |
| Node.js (LTS) e npm | Instalação das dependências e execução dos comandos do projeto           |
| Ionic CLI           | Compilação do aplicativo web (`npm install -g @ionic/cli`)               |
| Capacitor           | Geração e sincronização do projeto Android nativo                        |
| Android Studio      | Fornece o Android SDK, o JDK e o Gradle, necessários para compilar o APK |

### Procedimento de geração

1. **Instalar as dependências do projeto:**

   ```
   npm install
   ```

2. **Compilar o aplicativo web.** Os arquivos finais são gerados na pasta `www`:

   ```
   ionic build --prod
   ```

3. **Adicionar a plataforma Android** (somente na primeira vez). Cria a pasta `android` com o projeto nativo:

   ```
   npx cap add android
   ```

4. **Sincronizar o projeto.** Copia o conteúdo da pasta `www` e os plugins utilizados para o projeto Android. Deve ser executado sempre que o código for alterado:

   ```
   npx cap sync android
   ```

5. **Abrir o projeto no Android Studio:**

   ```
   npx cap open android
   ```

6. **Gerar o APK** no menu **Build > Build Bundle(s) / APK(s) > Build APK(s)**. Ao final, o Android Studio exibe um aviso com o link **locate**, que abre a pasta do arquivo gerado:

   `android/app/build/outputs/apk/debug/app-debug.apk`

   Alternativamente, o APK pode ser gerado pela linha de comando, sem abrir o Android Studio:

   ```
   cd android
   ./gradlew assembleDebug
   ```

   No Windows (PowerShell ou CMD), utilizar `gradlew.bat assembleDebug`.

### APK assinado (versão de distribuição)

O APK de debug é destinado a testes e à apresentação do projeto. Para uma versão de distribuição, o Android exige que o APK seja assinado com uma chave própria. No Android Studio, isso é feito em **Build > Generate Signed Bundle / APK**, selecionando **APK**, criando uma keystore (arquivo que contém a chave de assinatura e sua senha) e escolhendo a variante **release**. O arquivo gerado fica em `android/app/release/app-release.apk`.

A keystore não deve ser enviada ao repositório, pois quem possui esse arquivo pode publicar atualizações em nome do aplicativo.

### Instalação no dispositivo

| Método               | Procedimento                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| Transferência manual | Copiar o `.apk` para o celular, permitir a instalação de aplicativos de fontes desconhecidas e abrir o arquivo |
| Via cabo USB (ADB)   | Com a depuração USB ativada, executar `adb install app-debug.apk` no computador                                |
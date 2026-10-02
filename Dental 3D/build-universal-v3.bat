@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Build Universal V3 - React Vite Next.js

cd /d "%~dp0"

echo ============================================================
echo   BUILD UNIVERSAL V3 - REACT / VITE / NEXT.JS
echo ============================================================
echo Pasta: !CD!
echo.

rem ============================================================
rem 1. Validacoes
rem ============================================================

where node >nul 2>&1
if errorlevel 1 goto :node_missing

if not exist "package.json" goto :package_missing

rem ============================================================
rem 2. Detecta framework por varias estrategias
rem ============================================================

set "PROJECT_TYPE=GENERIC"
set "BUILD_SCRIPT="

for /f "usebackq delims=" %%A in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='SilentlyContinue'; $p=Get-Content -Raw -LiteralPath 'package.json' ^| ConvertFrom-Json; if($p.scripts -and $p.scripts.build){[string]$p.scripts.build}"`) do set "BUILD_SCRIPT=%%A"

rem Primeiro: detecta pelo build script
echo !BUILD_SCRIPT! | findstr /I /C:"next build" >nul 2>&1
if not errorlevel 1 set "PROJECT_TYPE=NEXT"

if /I "!PROJECT_TYPE!"=="GENERIC" (
    echo !BUILD_SCRIPT! | findstr /I /C:"vite build" >nul 2>&1
    if not errorlevel 1 set "PROJECT_TYPE=VITE"
)

if /I "!PROJECT_TYPE!"=="GENERIC" (
    echo !BUILD_SCRIPT! | findstr /I /C:"react-scripts build" >nul 2>&1
    if not errorlevel 1 set "PROJECT_TYPE=CRA"
)

rem Segundo: detecta por dependencias
if /I "!PROJECT_TYPE!"=="GENERIC" (
    for /f "usebackq delims=" %%A in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='SilentlyContinue'; $p=Get-Content -Raw -LiteralPath 'package.json' ^| ConvertFrom-Json; $deps=@(); if($p.dependencies){$deps += $p.dependencies.PSObject.Properties.Name}; if($p.devDependencies){$deps += $p.devDependencies.PSObject.Properties.Name}; if($deps -contains 'next'){'NEXT'} elseif($deps -contains 'vite'){'VITE'} elseif($deps -contains 'react-scripts'){'CRA'}"`) do set "PROJECT_TYPE=%%A"
)

rem Terceiro: detecta por arquivos tipicos
if /I "!PROJECT_TYPE!"=="GENERIC" (
    if exist "next.config.js" set "PROJECT_TYPE=NEXT"
    if exist "next.config.mjs" set "PROJECT_TYPE=NEXT"
    if exist "next.config.ts" set "PROJECT_TYPE=NEXT"
)

if /I "!PROJECT_TYPE!"=="GENERIC" (
    if exist "vite.config.js" set "PROJECT_TYPE=VITE"
    if exist "vite.config.ts" set "PROJECT_TYPE=VITE"
    if exist "vite.config.mjs" set "PROJECT_TYPE=VITE"
)

rem Quarto: estrutura Next App Router
if /I "!PROJECT_TYPE!"=="GENERIC" (
    if exist "app\layout.tsx" set "PROJECT_TYPE=NEXT"
    if exist "app\layout.jsx" set "PROJECT_TYPE=NEXT"
    if exist "src\app\layout.tsx" set "PROJECT_TYPE=NEXT"
    if exist "src\app\layout.jsx" set "PROJECT_TYPE=NEXT"
)

echo Tipo detectado: !PROJECT_TYPE!
if defined BUILD_SCRIPT echo Build script: !BUILD_SCRIPT!

if /I "!PROJECT_TYPE!"=="NEXT" echo Framework: Next.js
if /I "!PROJECT_TYPE!"=="VITE" echo Framework: React/Vite
if /I "!PROJECT_TYPE!"=="CRA" echo Framework: Create React App
if /I "!PROJECT_TYPE!"=="GENERIC" echo Framework: Generico
echo.

rem ============================================================
rem 3. Gerenciador de pacotes
rem ============================================================

set "PM=npm"
set "INSTALL_CMD=npm install"
set "BUILD_CMD=npm run build"

if exist "pnpm-lock.yaml" (
    where pnpm >nul 2>&1
    if errorlevel 1 goto :pnpm_missing
    set "PM=pnpm"
    set "INSTALL_CMD=pnpm install"
    set "BUILD_CMD=pnpm run build"
    goto :manager_ready
)

if exist "yarn.lock" (
    where yarn >nul 2>&1
    if errorlevel 1 goto :yarn_missing
    set "PM=yarn"
    set "INSTALL_CMD=yarn install"
    set "BUILD_CMD=yarn build"
)

:manager_ready
echo Gerenciador: !PM!
echo.

rem ============================================================
rem 4. Verificacao especial para Next.js
rem ============================================================

if /I "!PROJECT_TYPE!"=="NEXT" (
    call :check_database_url
    if errorlevel 2 goto :database_required
)

rem ============================================================
rem 5. Instala dependencias
rem ============================================================

echo [1/3] Instalando dependencias...
call !INSTALL_CMD!
if errorlevel 1 goto :build_error

rem ============================================================
rem 6. Limpa saida anterior
rem ============================================================

echo.
echo [2/3] Limpando build anterior...

if /I "!PROJECT_TYPE!"=="NEXT" (
    if exist ".next" rmdir /s /q ".next"
    if exist "out" rmdir /s /q "out"
    if exist "deploy-next" rmdir /s /q "deploy-next"
) else (
    if exist "dist" rmdir /s /q "dist"
    if exist "build" rmdir /s /q "build"
)

rem ============================================================
rem 7. Build
rem ============================================================

echo.
echo [3/3] Gerando build...
call !BUILD_CMD!
if errorlevel 1 goto :build_error

if /I "!PROJECT_TYPE!"=="NEXT" goto :next_result
goto :static_result

rem ============================================================
rem React / Vite / CRA
rem ============================================================

:static_result
set "OUTPUT_DIR="

if exist "dist\index.html" set "OUTPUT_DIR=dist"
if not defined OUTPUT_DIR if exist "build\index.html" set "OUTPUT_DIR=build"

if not defined OUTPUT_DIR goto :static_output_missing

call :create_spa_htaccess "!OUTPUT_DIR!"
if errorlevel 1 goto :htaccess_error

echo.
echo ============================================================
echo   BUILD ESTATICA CONCLUIDA
echo ============================================================
echo Tipo: !PROJECT_TYPE!
echo Pasta pronta:
echo !CD!\!OUTPUT_DIR!
echo.
echo Envie o CONTEUDO desta pasta para public_html.
echo.
start "" "!OUTPUT_DIR!"
goto :success_end

rem ============================================================
rem Next.js resultados
rem ============================================================

:next_result

if exist "out\index.html" goto :next_static
if exist ".next\standalone\server.js" goto :next_standalone
if exist ".next" goto :next_normal
goto :next_output_missing

:next_static
echo.
echo ============================================================
echo   NEXT.JS - EXPORTACAO ESTATICA CONCLUIDA
echo ============================================================
echo Pasta:
echo !CD!\out
echo.
echo Pode publicar o CONTEUDO de "out" em public_html.
echo.
start "" "out"
goto :success_end

:next_standalone
echo.
echo Preparando deploy-next...

if not exist "deploy-next" mkdir "deploy-next" >nul 2>&1
xcopy ".next\standalone\*" "deploy-next\" /E /I /Y /Q >nul

if exist "public" (
    if not exist "deploy-next\public" mkdir "deploy-next\public" >nul 2>&1
    xcopy "public\*" "deploy-next\public\" /E /I /Y /Q >nul
)

if exist ".next\static" (
    if not exist "deploy-next\.next\static" mkdir "deploy-next\.next\static" >nul 2>&1
    xcopy ".next\static\*" "deploy-next\.next\static\" /E /I /Y /Q >nul
)

echo.
echo ============================================================
echo   NEXT.JS STANDALONE CONCLUIDO
echo ============================================================
echo Pasta:
echo !CD!\deploy-next
echo.
echo Execute no servidor:
echo   node server.js
echo.
echo Este tipo precisa de Node.js no servidor.
echo.
start "" "deploy-next"
goto :success_end

:next_normal
echo.
echo ============================================================
echo   NEXT.JS BUILD CONCLUIDA
echo ============================================================
echo Saida:
echo !CD!\.next
echo.
echo Para executar:
echo   !PM! run start
echo.
echo Se usar API, SSR, banco ou autenticacao, precisa de Node.js.
echo.
start "" ".next"
goto :success_end

rem ============================================================
rem Verifica DATABASE_URL
rem Retorna errorlevel 2 se o projeto claramente exige a variavel
rem mas ela nao esta configurada.
rem ============================================================

:check_database_url
set "USES_DATABASE_URL="
set "REQUIRES_DATABASE_URL="
set "HAS_DATABASE_URL="
set "DB_FILES="

rem Procura referencias no codigo, ignorando node_modules e .next
for /f "usebackq delims=" %%A in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='SilentlyContinue'; $roots=@('app','src','pages','lib','server','prisma') ^| Where-Object {Test-Path $_}; if($roots){$files=Get-ChildItem $roots -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx,*.mjs,*.cjs,*.prisma -ErrorAction SilentlyContinue; $hits=$files ^| Select-String -Pattern 'DATABASE_URL' -SimpleMatch -List; if($hits){'1'}}"`) do set "USES_DATABASE_URL=%%A"

rem Procura mensagem fatal exata
for /f "usebackq delims=" %%A in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='SilentlyContinue'; $roots=@('app','src','pages','lib','server','prisma') ^| Where-Object {Test-Path $_}; if($roots){$files=Get-ChildItem $roots -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx,*.mjs,*.cjs -ErrorAction SilentlyContinue; $hits=$files ^| Select-String -Pattern 'DATABASE_URL is required' -SimpleMatch -List; if($hits){'1'}}"`) do set "REQUIRES_DATABASE_URL=%%A"

if defined DATABASE_URL (
    if not "!DATABASE_URL!"=="" set "HAS_DATABASE_URL=1"
)

call :check_env_file ".env.local"
call :check_env_file ".env.production"
call :check_env_file ".env"

if defined USES_DATABASE_URL (
    echo O projeto referencia DATABASE_URL.
)

if defined HAS_DATABASE_URL (
    echo [OK] DATABASE_URL configurada.
    exit /b 0
)

if defined REQUIRES_DATABASE_URL (
    echo.
    echo ============================================================
    echo   DATABASE_URL OBRIGATORIA E NAO CONFIGURADA
    echo ============================================================
    echo.
    echo Encontrei no codigo a validacao:
    echo   DATABASE_URL is required
    echo.
    echo Por isso o Next.js vai falhar durante:
    echo   Collecting page data
    echo.
    echo Crie este arquivo:
    echo   !CD!\.env.local
    echo.
    echo Conteudo:
    echo   DATABASE_URL="SUA_URL_REAL_DO_BANCO"
    echo.
    echo Arquivos onde DATABASE_URL aparece:
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$roots=@('app','src','pages','lib','server','prisma') ^| Where-Object {Test-Path $_}; if($roots){Get-ChildItem $roots -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx,*.mjs,*.cjs,*.prisma -ErrorAction SilentlyContinue ^| Select-String -Pattern 'DATABASE_URL' -SimpleMatch -List ^| ForEach-Object { '  ' + $_.Path }}"
    echo.
    exit /b 2
)

if defined USES_DATABASE_URL (
    echo [AVISO] DATABASE_URL nao encontrada.
    echo A build sera executada porque nao encontrei validacao fatal exata.
    echo.
)

exit /b 0

:check_env_file
set "ENV_FILE=%~1"
if not exist "!ENV_FILE!" exit /b 0

for /f "usebackq tokens=1,* delims==" %%A in ("!ENV_FILE!") do (
    if /I "%%A"=="DATABASE_URL" (
        set "DBVALUE=%%B"
        if defined DBVALUE set "HAS_DATABASE_URL=1"
    )
)
exit /b 0

rem ============================================================
rem .htaccess para SPA
rem ============================================================

:create_spa_htaccess
set "HT_DIR=%~1"
set "HT_FULL=!CD!\!HT_DIR!\.htaccess"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=$env:HT_FULL; $lines=@('<IfModule mod_rewrite.c>','  RewriteEngine On','  RewriteBase /','  RewriteRule ^index\.html$ - [L]','  RewriteCond %%{REQUEST_FILENAME} !-f','  RewriteCond %%{REQUEST_FILENAME} !-d','  RewriteRule . /index.html [L]','</IfModule>'); [System.IO.File]::WriteAllLines($p,$lines,(New-Object System.Text.UTF8Encoding($false)))"

if errorlevel 1 exit /b 1
if not exist "!HT_DIR!\.htaccess" exit /b 1
exit /b 0

rem ============================================================
rem Erros
rem ============================================================

:database_required
echo.
echo ============================================================
echo   BUILD NAO INICIADA
echo ============================================================
echo.
echo Motivo: este projeto Next.js exige DATABASE_URL.
echo.
echo Isso evita repetir o mesmo erro durante "Collecting page data".
echo.
echo Depois de configurar .env.local, execute este BAT novamente.
goto :error_end

:node_missing
echo [ERRO] Node.js nao encontrado.
goto :error_end

:package_missing
echo [ERRO] package.json nao encontrado.
echo Pasta atual:
echo !CD!
goto :error_end

:pnpm_missing
echo [ERRO] pnpm nao instalado.
echo Execute: npm install -g pnpm
goto :error_end

:yarn_missing
echo [ERRO] Yarn nao instalado.
echo Execute: npm install -g yarn
goto :error_end

:static_output_missing
echo [ERRO] Build terminou, mas nao achei dist\index.html nem build\index.html.
goto :error_end

:next_output_missing
echo [ERRO] Build terminou, mas nao achei .next nem out.
goto :error_end

:htaccess_error
echo [ERRO] Nao foi possivel criar o .htaccess.
goto :error_end

:build_error
echo.
echo ============================================================
echo   ERRO DURANTE O BUILD
echo ============================================================
echo Framework: !PROJECT_TYPE!
echo.
if /I "!PROJECT_TYPE!"=="NEXT" (
    echo Se o erro mencionar DATABASE_URL:
    echo configure a URL real em .env.local.
)
goto :error_end

:success_end
echo.
echo ============================================================
echo   PROCESSO FINALIZADO COM SUCESSO
echo ============================================================
echo.
pause
exit /b 0

:error_end
echo.
echo ============================================================
echo   PROCESSO INTERROMPIDO
echo ============================================================
echo.
pause
exit /b 1

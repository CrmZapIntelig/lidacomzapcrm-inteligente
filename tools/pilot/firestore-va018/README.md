# Teste isolado das Rules VA-01.8

Este kit testa somente a candidata `docs/pilot/security/firestore.va-01-8.candidate.rules` em um emulador descartável.

- `node_modules/` e `.runtime/` são locais e ignorados pelo Git.
- O Java 21 portátil evita alterar o Java global da máquina.
- O projeto Firebase real e o banco nomeado não recebem leituras nem escritas durante os testes.
- A compilação remota usa `--dry-run`; publicar continua sendo um gate separado.

Execução no PowerShell, a partir da raiz do repositório:

```powershell
$pilotJava = (Get-ChildItem tools\pilot\firestore-va018\.runtime -Directory | Select-Object -First 1).FullName
$env:JAVA_HOME = $pilotJava
$env:Path = "$pilotJava\bin;$env:Path"
firebase emulators:exec --only firestore --config firebase.va018.emulator.json --project va018-rules-test "npm test --prefix tools/pilot/firestore-va018"
```

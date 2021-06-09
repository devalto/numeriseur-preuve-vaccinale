# RAM-QR-Code scanneur

Numériseur et vérifier la preuve vaccinale fournie par le gouvernement du Québec.

Cet outil est un prototype pour scanner le QR-Code fournit lors de votre première ou deuxième dose de vaccin. L'application est disponible sur [https://covidscanner.deval.to/](https://covidscanner.deval.to/).

## Installation locale

Vous pouvez également créer et exécuter une version locale de RAM-QR-Code scanneur avec l'outil [Node.js](https://nodejs.org/en/):

```shell
$ git clone https://github.com/devalto/numeriseur-preuve-vaccinale.git
$ cd numeriseur-preuve-vaccinale
$ npm i
$ npm run build
$ cp -R dist/* /var/www # Copier les fichiers générés vers le serveur HTTP
```

## Modifications

Pour tester localement vos modifications, vous pouvez utiliser la commande suivante:

```shell
$ git clone https://github.com/devalto/numeriseur-preuve-vaccinale.git
$ cd numeriseur-preuve-vaccinale
$ npm i
$ npm run start # testable sur localhost:8080
```

Vous pouvez étudier le [code source](https://github.com/devalto/numeriseur-preuve-vaccinale/tree/main/src) de l'application, le redistribuer, le modifier, et redistribuer une version modifiée selon les termes de la license [Affero-GPL](https://www.gnu.org/licenses/agpl-3.0.html)

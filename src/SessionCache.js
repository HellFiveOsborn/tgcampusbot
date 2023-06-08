const fs = require('fs');

class SessionCache {
    constructor() {
        this.cache = {};
        this.timeouts = {};
        this.cacheFilePath = 'cache.json';

        // Carregar o cache do arquivo, se existir
        if (fs.existsSync(this.cacheFilePath)) {
            const cacheData = fs.readFileSync(this.cacheFilePath, 'utf8');
            if (cacheData) {
                this.cache = JSON.parse(cacheData);
            }
        }
    }

    // Salvar o cache no arquivo
    saveCache() {
        fs.writeFileSync(this.cacheFilePath, JSON.stringify(this.cache));
    }

    // Definir um valor no cache
    set(key, value) {
        if (this.cache.hasOwnProperty(key)) {
            // A chave já existe no cache, substituir o valor
            this.cache[key] = value;
        } else {
            // A chave não existe no cache, adicionar uma nova entrada
            this.cache[key] = value;
        }
        this.saveCache();
    }

    // Definir um valor no cache com tempo de expiração
    setEx(key, value, exp) {
        if (this.cache.hasOwnProperty(key)) {
            // A chave já existe no cache, substituir o valor e o tempo de expiração
            this.cache[key] = value;

            // Verificar se já existe um timeout para essa chave e cancelá-lo
            if (this.timeouts.hasOwnProperty(key)) {
                clearTimeout(this.timeouts[key]);
            }

            // Configurar o novo tempo de expiração
            this.timeouts[key] = setTimeout(() => {
                this.delete(key);
            }, exp * 1000);
        } else {
            // A chave não existe no cache, adicionar uma nova entrada com o tempo de expiração
            this.cache[key] = value;

            // Configurar o tempo de expiração
            this.timeouts[key] = setTimeout(() => {
                this.delete(key);
            }, exp * 1000);
        }

        this.saveCache();
    }

    // Obter um valor do cache
    get(key) {
        return this.cache[key];
    }

    // Remover um valor do cache
    delete(key) {
        delete this.cache[key];
        this.saveCache();
    }
}

module.exports = SessionCache;
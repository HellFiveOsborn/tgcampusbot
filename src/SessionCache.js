const fs = require('fs');

class SessionCache {
    constructor() {
        this.cache = {};
        this.timeouts = {};
        this.cacheFilePath = 'cache.json';

        // Verificar se o arquivo cache.json existe, se não, criar um arquivo vazio
        if (!fs.existsSync(this.cacheFilePath)) {
            // Criar o arquivo cache.json vazio
            fs.writeFileSync(this.cacheFilePath, JSON.stringify({}), 'utf8');
        }

        // Carregar o cache do arquivo, se existir e for válido
        const cacheData = fs.readFileSync(this.cacheFilePath, 'utf8');
        if (cacheData) {
            try {
                this.cache = JSON.parse(cacheData);
            } catch (error) {
                console.error('Erro ao parsear o cache.json, usando cache vazio.', error);
                this.cache = {}; // Se houver erro, usar cache vazio
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
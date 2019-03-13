var gulp = require('gulp');
var envJS = require('./env');
var fs = require('fs');
var axios = require('axios');
var readline = require('readline');

gulp.task('i18nDownloadJS', async function() {
    var askQuestion = function(query) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
    
        return new Promise(resolve => rl.question(query, ans => {
            rl.close();
            resolve(ans);
        }))
    }

    /**
     * Chaves que o usuário optou por importar/alterar.
     */
    var modifiedKeys = [];

    try {
        var localeResponse = await axios.get(envJS.PHRASEAPP_API + '/projects/' + envJS.PHRASEAPP_SITE_REPO_ID + '/locales', {
            params: {
                access_token: envJS.PHRASEAPP_TOKEN
            }
        })
        localeResponse.data = localeResponse.data.filter(function(data) {
            return data.code === 'pt-BR'
        })
        var length = localeResponse.data.length;
        
        for(var i = 0; i < length; i++) {            
            var locale = localeResponse.data[i].code.toLowerCase();
            var transResponse = await axios.get(envJS.PHRASEAPP_API + '/projects/' + envJS.PHRASEAPP_SITE_REPO_ID + '/locales/' + localeResponse.data[i].id + '/download', {
                params: {
                    access_token: envJS.PHRASEAPP_TOKEN,
                    include_unverified_translations: true,
                    encoding: 'UTF-8',
                    file_format: 'nested_json'
                }
            })
            transResponse = transResponse.data.rcjs;

            try {
                var fileBuffer = fs.readFileSync('web/i18n/' + locale + '/translations.js')
                var translationSource = fileBuffer.toString('utf8')
                translationSource = JSON.parse(translationSource);
                var keys = Object.keys(transResponse);
                var keysLength = keys.length;
                for(var j = 0; j < keysLength; j++) {
                    var currentKey = keys[j];
                    
                    if(translationSource.hasOwnProperty(currentKey)) {
                        if(translationSource[currentKey] !== transResponse[currentKey]
                            && !modifiedKeys.includes(currentKey)) {
                            //DIFF
                            console.log('O valor de ' + currentKey + ' foi modificado desde a última importação.');
                            var ans = await askQuestion('Atualizar chave? (Y, n)')
                            if(ans === 'Y' || ans === '') {
                                translationSource[currentKey] = transResponse[currentKey];
                                modifiedKeys.push(currentKey)
                            }                        
                        }
                    } else {
                        //NEW
                        if(!modifiedKeys.includes(currentKey)) {
                            console.log('Nova chave encontrada: ' + currentKey + '.');
                            var ans = await askQuestion('Importar chave? (Y, n)')
                            if(ans === 'Y' || ans === '') {
                                translationSource[currentKey] = transResponse[currentKey];
                                modifiedKeys.push(currentKey)
                            
                            }
                        }
                        
                    }
                }
                fs.writeFileSync('web/i18n/' + locale + '/translations.js', JSON.stringify(translationSource), function (err) {
                    if (err) throw err;
                    console.log('Saved!');
                });
            } catch(err) {
                console.log('erro com locale: ' + locale, err)
            }  
        }
    } catch (err) {
        console.log('erro ao baixar locales' + err)
    }
})

gulp.task('default', ['i18nDownloadJS'])
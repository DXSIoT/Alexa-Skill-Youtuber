/////
require('dotenv').config()
var alexa = require("alexa-app");
var http_request = require('sync-request');
var moment = require('moment');
var AmazonSpeech = require('ssml-builder/amazon_speech');
/////
var BASE_API= process.env.BASE_API;
var CHANNEL = process.env.CHANNEL;
var CHANNEL_NAME = process.env.CHANNEL_NAME;
var API_KEY = process.env.API_KEY;
var BG_MD = process.env.BG_MD;
var BG_SM = process.env.BG_SM;
// ---
var CHANNEL_DATA = {};
var ALEXA_PRESENTATION_APL = 'Alexa.Presentation.APL';
/////

var app = new alexa.app("Skill-Youtuber");

app.launch(function(request, response) {
    //console.log('request:',request);
    
    getChannelData(response);
    
    var bannerImageUrl = getChannelDataValue('bannerImageUrl');
    var bannerTvHighImageUrl = getChannelDataValue('bannerTvHighImageUrl');
    var subscriberCount = getChannelDataValue('subscriberCount');
    var videoCount = getChannelDataValue('videoCount');
    var thumbnails_medium = getChannelDataValue('thumbnails_medium');
    var thumbnails_high = getChannelDataValue('thumbnails_high');
    
    var apl = aplEnabled(request);
    
    var texto = "El canal de " 
                + CHANNEL_NAME 
                + " tiene hasta el momento "
                + videoCount 
                + " videos publicados y "
                + subscriberCount
                + " subscriptores."
                + " Puedes preguntar sobre el número de subscriptores"
                + " y el último video publicado."
                + " Pide ayuda en cualquier momento.";
    if(apl){
        texto += " Este Skill tiene soporte Multidispositivo.";
    }                
                
    response.card({
      type: "Standard",
      title: "Bienvenido", // this is not required for type Simple or Standard
      text: texto,
      image: { // image is optional
        smallImageUrl: thumbnails_medium, // required
        largeImageUrl: thumbnails_high
      }
    });
    
    if(aplEnabled(request)){
        response.directive({
            type: 'Alexa.Presentation.APL.RenderDocument',
            version: '1.0',
            document: loadTemplate('long-text'),
            datasources: buildLongTextData('Bienvenido',texto)
        });
    }
        
    var speechOutput = new AmazonSpeech()
        .emphasis('reduced', 'Bienvenido')
        .pause("500ms")
        .say("Te daré información del canal de ")
        .say(CHANNEL_NAME)
        .pause("1s")
        .say("El canal tiene")
        .say(subscriberCount)
        .say("subscriptores y")
        .say(videoCount)
        .say("videos publicados hasta el momento.")
        .ssml();
        
    response.say(speechOutput)
        .shouldEndSession(false)
        .send();
});

app.intent("AMAZON.StopIntent",
    function(request, response){
        response
            .say("Esta bien, nos vemos")
            .send();
    });

app.intent("AMAZON.CancelIntent",
    function(request, response){
        response
            .say("Cancelado, vuelve pronto")
            .send();
    });

app.intent("CreditsIntent",
    function(request, response){
        response
            .say("Este skill fue creado por Daxes Hacks, visita su canal para aprender como realizar uno por ti mismo o contacta para crear uno para tu canal.")
            .shouldEndSession(false)
            .send();
    });

app.intent("AMAZON.HelpIntent",
    function(request, response){   
        var apl = aplEnabled(request);
        var speechOutput = new AmazonSpeech()
                .say("Puedes preguntarme el número de subscriptores, y sobre el último video publicado en el canal");
        if(apl){
            speechOutput = speechOutput.pause("1s").say("Este skill tiene soporte multidispositivo");
            response.directive({
                type: 'Alexa.Presentation.APL.RenderDocument',
                version: '1.0',
                document: loadTemplate('long-text'),
                datasources: buildLongTextData('Ayuda','Puedes preguntarme el número de subscriptores, y sobre el último video publicado en el canal.')
            });
        }
        speechOutput = speechOutput.ssml();
                
        response.say(speechOutput)
            .shouldEndSession(false)
            .send();
    });
    
app.intent("SubscriptorsIntent",
    function(request, response){
        console.log('request:',request);
        
        var nsubs = 0;
        var model = 'persona';
        var model2= 'suscriptor';
        
        var json = getChannelData(response);
        
        if(json){
            var title = getChannelDataValue('title');
            var thumbnails_medium = getChannelDataValue('thumbnails_medium');
            var thumbnails_high = getChannelDataValue('thumbnails_high');
        
            nsubs = getChannelDataValue('subscriberCount');
            if(nsubs == 0 || nsubs > 0){ model+='s';model2+='es'; }
            
            var text = "El canal tiene actualmente " + nsubs + " " + model2 + ".";
            response.card({
              type: "Standard",
              title: title, // this is not required for type Simple or Standard
              text: text,
              image: { // image is optional
                smallImageUrl: thumbnails_medium, // required
                largeImageUrl: thumbnails_high
              }
            });
            
            if(aplEnabled(request)){
                response.directive({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.0',
                    document: loadTemplate('long-text'),
                    datasources: buildLongTextData(title,text)
                });
            }
            
            var speechOutput = new AmazonSpeech()
                .say("Hay ")
                .say(nsubs)
                .say(model)
                .say(" subscritas al canal hasta el momento.")
                .ssml();
                
            response.say(speechOutput)
                .shouldEndSession(false)
                .send();
        }
    });   
    
app.intent("LastVideoIntent",
    function(request, response){
        console.log('request:',request);
        
        var json = getVideoUploadData(response);
        if(json){
            var lastVideo = json.items[0];
            
            var title = lastVideo.snippet.title;
            var description = lastVideo.snippet.description;
            var thumbnails_medium = lastVideo.snippet.thumbnails.standard.url;
            var thumbnails_high = lastVideo.snippet.thumbnails.high.url;
            
            response.card({
              type: "Standard",
              title: title, // this is not required for type Simple or Standard
              text: description,
              image: { // image is optional
                smallImageUrl: thumbnails_medium, // required
                largeImageUrl: thumbnails_high
              }
            });
            
            if(aplEnabled(request)){
                response.directive({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    version: '1.0',
                    document: loadTemplate('left-image-detail'),
                    datasources: buildLeftImageData(title,'',description,thumbnails_medium,thumbnails_high)
                });
            }
            
            var speechOutput = new AmazonSpeech()
                .say("El último video titulado")
                .pause('500ms')
                .say(lastVideo.snippet.title)
                .pause('500ms')
                .say('fue publicado el')
                .sayAs({
                  word: moment(lastVideo.snippet.publishedAt).format('YYYYMMDD'),
                  interpret: "date",
                })
                .ssml();
            response.say(speechOutput)
                .shouldEndSession(false)
                .send();
        }
    });      

// connect to lambda
exports.handler = app.lambda();

////////////////////////////

var loadTemplate = function(name){
    var jsonData = require('./templates/'+ name +'.json');    
    return jsonData;
}

var getApiResponse = function(url_api){ 
    var resp = http_request('GET', url_api );
    var json = JSON.parse(resp.getBody('utf8'));
    return json;
}

var getApiContent = function(method,part,params = {},response){
    try {
        var querys = [];
        Object.keys(params).forEach(function(key) {
            querys.push(key+'='+params[key]);
        });
        var url = BASE_API + '/' + method + '?part=' + part + '&' + querys.join('&');
        console.log('url', url);
        var json = getApiResponse(url);
        console.log('json', json);
        if(json.error){
            response
                .say("Hubo un error en la consulta a los servicios externos")
                .shouldEndSession(false)
                .send();
            return false;
        }else{ 
            return json;
        }
    } catch (err) { //throw err;
        response
            .say("Hubo un error al obtener información de los servicios externos")
            .shouldEndSession(false)
            .send();
        return false;    
    }
}

var getChannelDataValue = function(data,response){
    if(CHANNEL_DATA.hasOwnProperty(data)){
        console.log('data [' + data + '] already loaded');
        return CHANNEL_DATA[data];
    }else{
        var json = getChannelData(response);
        return CHANNEL_DATA[data];
    }
}

var getChannelData = function(response){
    var json = getApiContent
        (
            'channels',
            'snippet,statistics,contentDetails,brandingSettings',
            {
                'id': CHANNEL,
                'key': API_KEY
            },
            response
        );
    
    if(json){
        console.log('Channel Data loaded');
        CHANNEL_DATA['subscriberCount'] = json.items[0].statistics.subscriberCount;
        CHANNEL_DATA['videoCount'] = json.items[0].statistics.videoCount;
        CHANNEL_DATA['viewCount'] = json.items[0].statistics.viewCount;
        
        CHANNEL_DATA['uploads'] = json.items[0].contentDetails.relatedPlaylists.uploads;
        CHANNEL_DATA['favorites'] = json.items[0].contentDetails.relatedPlaylists.favorites;
        
        //CHANNEL_DATA['bannerImageUrl'] = json.items[0].brandingSettings.image.bannerImageUrl;
        //CHANNEL_DATA['bannerTvHighImageUrl'] = json.items[0].brandingSettings.image.bannerTvHighImageUrl || CHANNEL_DATA['bannerImageUrl'];
        CHANNEL_DATA['bannerImageUrl'] = BG_SM;
        CHANNEL_DATA['bannerTvHighImageUrl'] = BG_MD;
        
        CHANNEL_DATA['thumbnail'] = json.items[0].snippet.thumbnails.default.url;
        CHANNEL_DATA['thumbnails_medium'] = json.items[0].snippet.thumbnails.medium.url;
        CHANNEL_DATA['thumbnails_high'] = json.items[0].snippet.thumbnails.high.url;
        CHANNEL_DATA['title'] = json.items[0].snippet.title;
        console.log(CHANNEL_DATA);
    }
        
    return json;
}

var getVideoUploadData = function(response){
    var playlistId = getChannelDataValue('uploads');
    var json = getApiContent
        (
            'playlistItems',
            'snippet,contentDetails,status',
            {
                'playlistId': playlistId,
                'key': API_KEY
            },
            response
        );
    return json;
}

var aplEnabled = function(request){
    return request.context.System.device.supportedInterfaces.hasOwnProperty(ALEXA_PRESENTATION_APL);
}


var buildLongTextData = function(title,text){
    var bannerImageUrl = getChannelDataValue('bannerImageUrl');
    var bannerTvHighImageUrl = getChannelDataValue('bannerTvHighImageUrl');
    var thumbnail = getChannelDataValue('thumbnail');
    var data = {
        "bodyTemplateData": {
            "type": "object",
            "objectId": "bt1Sample",
            "backgroundImage": {
                "smallSourceUrl": bannerImageUrl,
                "largeSourceUrl": bannerTvHighImageUrl
            },
            "title": title,
            "textContent": {
                "primaryText": text,
            },
            "logoUrl": thumbnail
        }
    };
    console.log('dataSource: ', data);
    return data;
}

var buildLeftImageData = function(title,subtitle,description,thumbnails_medium,thumbnails_high){
    
    var bannerImageUrl = getChannelDataValue('bannerImageUrl');
    var bannerTvHighImageUrl = getChannelDataValue('bannerTvHighImageUrl');
    var thumbnail = getChannelDataValue('thumbnail');
    var name = getChannelDataValue('title');
    
    var data = {
        "bodyTemplate3Data": {
            "type": "object",
            "objectId": "bt3Sample",
            "backgroundImage": {
                "smallSourceUrl": bannerImageUrl,
                "largeSourceUrl": bannerTvHighImageUrl
            },
            "title": name,
            "image": {
                "smallSourceUrl": thumbnails_medium,
                "largeSourceUrl": thumbnails_high
            },
            "textContent": {
                "title": title,
                "subtitle": subtitle,
                "primaryText": description
            },
            "logoUrl": thumbnail,
            "hintText": "Prueba, \"Alexa, ultimo video\""
        }
    }
    console.log('dataSource: ', data);
    return data;
}

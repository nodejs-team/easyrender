/**
 * Created by semdy on 2016/9/6.
 */

(function(EC, undefined){
    "use strict";

    var MovieClip = EC.Sprite.extend({
        initialize: function(resUrl, res, resKey){
            MovieClip.superclass.initialize.call(this);

            this._startFrame = 0;
            this._startTime = 0;
            this._playTimes = -1;
            this._resKey = resKey;
            this.currentFrame = 0;
            this.isPlaying = false;

            this.setRES(resUrl, res);
            this._clip = new EC.BitMap(this.RESUrl);

            if( Array.isArray(this.RESUrl) ){
                this.width = this.RESUrl[0].width;
                this.height = this.RESUrl[0].height;
                this.totalFrames = this.RESUrl.length;
                this.setFrame = this.setFrameByPath;
            } else {
                var _key = this.RES.mc[resKey].frames[0].res;
                var _resData = this.RES.res[_key];
                this.width = _resData.w;
                this.height = _resData.h;
                this.setFrame = this.setFrameBySprite;
            }

            this._timer = new EC.Timer(this.frameRate, this._repeatCount);
            this._initEvents();
        },

        setRES: function( resUrl, res, frameRate ){
            this.RESUrl = _getResUrl(resUrl);
            this.RES = _getResData(res, this._resKey);
            this.currentFrame = 0;
            this.frame = this.getMovieClipData(this._resKey);
            this.frameRate = Math.round(1000/(this.frame.frameRate||24));
            this.totalFrames = this.frame.frames.length;

            if( !Array.isArray(this.RESUrl) ) {
                if( EC.isObject(this.RESUrl) && "nodeType" in this.RESUrl ){
                    this.RESUrl = {
                        texture: this.RESUrl,
                        width: this.RESUrl.width,
                        height: this.RESUrl.height
                    }
                }
                this.texture = this.RESUrl.texture;
            } else {
                this.texture = this.RESUrl[this.currentFrame].texture;
            }

            if( frameRate ){
                this.setFrameRate(frameRate);
            }
        },

        getMovieClipData: function(key){
            return this.RES.mc[key]||[];
        },

        gotoAndPlay: function(startFrame, playTimes, frameRate){
            startFrame = Math.max(0, startFrame-1);

            this._startFrame = startFrame;
            this._playTimes = playTimes;
            this.currentFrame = startFrame;

            if( this._playTimes > 0 ){
                this._repeatCount = this._playTimes*this.totalFrames;
                this._timer.setRepeatCount(this._repeatCount);
            }

            if( frameRate ){
                this.setFrameRate(Math.round(1000/frameRate));
            }

            this.setFrame(this.currentFrame);
            this.play();

            return this;
        },

        gotoAndStop: function( frameIndex ){
            this.stop();
            this.setFrame( frameIndex );
            return this;
        },

        prevFrame: function(){
            return this.setFrame(--this.currentFrame);
        },

        nextFrame: function(){
            return this.setFrame(++this.currentFrame);
        },

        play: function(){
            if( this.isPlaying ) {
                return this;
            }

            this._startTime = Date.now();
            this._timer.start();
            this.isPlaying = true;

            return this;
        },

        stop: function(){
            this._timer.stop();
            this.isPlaying = false;
            return this;
        },

        pause: function(dur){
            this._timer.pause(dur);
            this._startTime += dur;
            this.isPlaying = false;
            return this;
        },

        wait: function(waitTime){
            this._timer.wait(waitTime);
            return this;
        },

        setFrameRate: function(frameRate){
            this.frameRate = frameRate;
        },

        setFrameBySprite: function( index ){
            var resItem = this.frame.frames[index]||{};
            var res = this.RES.res[resItem.res];

            if( res === undefined ) return;

            this._timer.delay = (resItem.duration || 0) * this.frameRate;

            this._clip.x = resItem.x || 0;
            this._clip.y = resItem.y || 0;
            this._clip.sx = res.x || 0;
            this._clip.sy = res.y || 0;
            this._clip.swidth = res.w || this.width || 0;
            this._clip.sheight = res.h || this.height || 0;
            this._clip.width = this._clip.swidth;
            this._clip.height = this._clip.sheight;

            /*this.width = this.width || this._clip.width;
            this.height = this.height || this._clip.height;*/

            this.width = this._clip.width;
            this.height = this._clip.height;

            return this;
        },

        setFrameByPath: function( index ){
            var resItem = this.frame.frames[index]||{};
            var resData = this.RESUrl[index];

            this._timer.delay = (resItem.duration || 0) * this.frameRate;

            this._clip.texture = resData.texture;
            this._clip.x = resItem.x || 0;
            this._clip.y = resItem.y || 0;
            this._clip.width = resData.width || this._clip.width || 0;
            this._clip.height = resData.height || this._clip.height || 0;
            this.width = this._clip.width;
            this.height = this._clip.height;

            return this;
        },

        _initEvents: function(){

            this.on("addToStage", function () {
                this.addChild(this._clip);
            }, this);

            this._timer.on('timer', function(){
                if( ++this.currentFrame > this.totalFrames - 1 ){
                    this.currentFrame = this._startFrame;
                    this.dispatch('loopcomplete');
                }

                this.setFrame(this.currentFrame);
            }, this);

            this._timer.on('complete', function(){
                this.off('enterframe');
                this.dispatch('complete');
            }, this);

            this._timer.on('pause', function(){
                this.dispatch('pause');
            }, this);
        }

    });

    var _getResUrl = function(resUrl){
        if( /_(png|jpg|jpeg|gif|bmp|webp)$/.test(resUrl) ){
            return RES.getRes(resUrl);
        }
        return resUrl;
    };

    var _getResData = function(res, resKey){
        if( typeof res === 'string' ){
            return RES.getRes(res);
        }
        else if( Array.isArray(res) ){
            var resFrames = [];
            var resObj = {};
            var resCfg = {mc:{}, res:{}};

            res.forEach(function(resItem){
                var pos = resItem.split(' ');
                var uid = _genUID();
                resFrames.push({
                    res: uid,
                    x: 0,
                    y: 0,
                    duration: 1
                });

                resObj[uid] = {
                    x: -1*pos[0],
                    y: -1*pos[1]
                }
            });

            resCfg.mc[resKey] = {
                frames: resFrames,
                frameRate: 24
            };

            resCfg.res = resObj;

            return resCfg;
        } else if( typeof res === 'object' && !res.mc ) {
            var resFrames = [];
            var resObj = {};
            var resCfg = {mc:{}, res:{}};

            for(var i in res) {
                var pos = res[i];
                var uid = _genUID();
                resFrames.push({
                    res: uid,
                    key: i,
                    x: pos.offX,
                    y: pos.offY,
                    duration: pos.duration === undefined ? 1 : pos.duration
                });

                resObj[uid] = {
                    x: pos.x,
                    y: pos.y,
                    w: pos.w,
                    h: pos.h
                }
            }

            resFrames = resFrames.sort(function (a, b) {
                return parseInt(a.key.replace(/^[^\d]+/, "")) - parseInt(b.key.replace(/^[^\d]+/, ""));
            });

            resCfg.mc[resKey] = {
                frames: resFrames,
                frameRate: 24
            };

            resCfg.res = resObj;

            return resCfg;
        }

        return res;
    };

    var _genUID = function(len){
        var g = '',
            i = 0;
        len = len || 8;

        while (i++ < len){
            g += Math.floor(Math.random() * 16.0).toString(16);
        }

        return g.toUpperCase();
    };

    EC.provide({
        MovieClip: MovieClip
    });

})(window.EC);
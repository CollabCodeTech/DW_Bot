import {error} from 'util';
const irc = require('tmi.js');

export class Bot {
  client:any;
  whisperClient:any = null;
  _config:any;
  commands:Object = {};
  userGroups:String[] = ['*', '$', '@'];
  whisperConfig:any;
  whisperArray:any = [];
  whisperCycle:Boolean = false;

  constructor(config = {}) {
    this._config = config;
    this.client = new irc.client(config);
    this.whisperConfig = config;
  }

  startupWhispers(config) {
    config.connection = {
      server: 'group.tmi.twitch.tv',
      port: 80,
      reconnect: true
    };

    this.whisperClient = new irc.client(config);

    this.whisperClient.connect();
    this.whisperClient.addListener('whisper', this.receiveWhisper.bind(this));
  }

  chat(channel, user, message, bot, action) {
    if (message[0] === this._config.commandCharacter) {
      this.tryCommand(user.username, message)
    }
  }

  receiveWhisper(from: String, message: String) {
    if (message[0] === this._config.commandCharacter) {
      this.tryCommand(from, message)
    }
  }

  whisper(user: String, message: String, cb: Function = () => {}) {
    if (!user || !message) return;
    this.whisperClient.say(this._config.channels[0], `/w ${user} ${message}`);
  }

  whisperQ(user: String, message: String) {
    this.whisperArray.push({user: user, message: message});
    if (!this.whisperCycle) this.sendWhisperQ();
  }

  sendWhisperQ() { // send first whisper.
    this.whisperCycle = true;
    let w = this.whisperArray[0];

    if (w) this.whisper(w.user, w.message);

    if (this.whisperArray.length > 0) {
      this.whisperArray.shift();
      setTimeout(() => this.sendWhisperQ(), 1600);
    } else {
      this.whisperCycle = false;
    }
  }



  say(text: String, cb: Function = () => {}) {
    this.client.say(this._config.channels[0], text);
    return cb();
  }

  //static connectWhisper(config) {
  //  new irc.client(config);
  //}

  get Mods() {
    return this.client.mods(this._config.channels[0]);
  }

  isMod(name:String, cb:Function) {
    if (name === this._config.channels[0].slice(1)) return cb(true);
    this.Mods.then((res) => {
      if (res.indexOf(name) !== -1) {
        return cb(true);
      }
      return cb(false);
    });

  }

  addCommand(command:String, response:Function) {
    if (typeof command === 'string') {
      if (command[0] === '*' || command[0] === '$' || command[0] === '@') {
        this.commands[command.slice(1).toLowerCase()] = {
          command: command.slice(1).toLowerCase(),
          response: response,
          rights: this.userGroups.indexOf(command[0])
        }
      }
      else throw error('command does not have an Identifier. *, $, or @!');
    }
  }

  tryCommand(from:String, text:String, params:any = []) {
    if (text.length > this._config.commandCharacter.length && text[0] == this._config.commandCharacter) {
      let command = text.slice(this._config.commandCharacter.length).split(/\s+/g)[0].toLowerCase();
      let o = {from: from, text: text, rest: null, args: null, params: params};

      if (typeof command === 'string' && this.commands[command]) {
        o.rest = text.slice(command.length + 1).trim();
        o.args = o.rest.split(/\s+/g).map(function (x) {
          var t = +x;
          return isNaN(t) ? x : t
        });
        let obj = this.commands[command];
        if (obj.rights === 0) {//TODO: add mod if statement later.
          this.doCommand(command, obj.response, o)
        }
        else if (obj.rights === 2) {
          this.isMod(from, res => {
            if (res) this.doCommand(command, obj.response, o)
          });
        }
      }
    }
  }

  doCommand(command:String, response:Function, o:Object) {
    if (typeof command === 'string' && typeof response === 'function') {
      response.call(this, o);
    }
  }

  selfCommand(text:String, ...params) { //this only used for the bot to tell itself to do a command.
    return this.tryCommand(this._config.identity.username, text, params);
  }

  get config() {
    return this._config;
  }

  set config(newConfig) {
    this._config = newConfig
  }

  run() {

    this.client.connect();
    this.client.addListener('chat', this.chat.bind(this));

    this.startupWhispers(this._config);

  }
}


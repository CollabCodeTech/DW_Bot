import { EventEmitter } from 'events';
import * as Rx from '@reactivex/rxjs';
import { error } from 'util';
import { childOfKind } from 'tslint';
const irc = require('tmi.js');

export enum UserType {
  Normal,
  Subscriber,
  Mod,
}

// Different Streams that are connected to Event Emitters.
const $ = {
  IncChat: 'IncChat$',
  OutChat: 'OutChat$',
};

export interface IUser {
  badges?: { [key: string]: string; };
  color: any;
  'display-name': string;
  emotes: any;
  id: string;
  mod: boolean;
  'room-id': string;
  'sent-ts': string;
  subscriber: boolean;
  'tmi-sent-ts': string;
  turbo: boolean;
  'user-type': string;
  username: string;
  'message-type': 'chat' | 'whisper';
}

// input coming from user in chat.
export interface IInput {
  ch: string;
  user: IUser;
  msg: string;
  self: boolean;
  action: any;
}

export interface ICommand {
  string: string;
  action: Function;
  lastExe?: number;
  reqRights?: any;
  debounce?: number;
}

export class TwitchBot {
  public client: any;
  public botEE: EventEmitter;
  public commands: {[key: string]: ICommand} = {};
  public userGroups: [string] = ['*', '$', '@'];

  constructor(private config: {[key: string]: any}) {
    this.botEE = new EventEmitter();
    this.client = new irc.client(this.config);

    Rx.Observable.fromEvent(this.botEE, $.IncChat, (obj: any) => obj)
      .filter(input => this.isCommand(input.msg))
      .filter(input => this.checkDebounce(this.normalizeMessage(input.msg)))
      .filter(input => this.checkPermissions(input))
      .subscribe((a: any) => console.log(`subscribe: ${a}`));
  }

  public addCommand(
    command: string, action: Function, debounce: number = 0) {
    // When adding a command, you can specify what 'kind' of command it is.
    // For example '*' means everyone can use this command,
    // '$' means only subscribers can use it.
    // and '@' is mod. These are identifiers.
    // identifier + string = command;
    if (this.userGroups.includes(command[0])) {
      const string = command.substr(1).toLowerCase();
      return this.commands[string] = {
        action,
        debounce,
        string,
        reqRights: this.userGroups.indexOf(command[0]),
        lastExe: Date.now(),
      };

    } else {
      throw new Error(`command needs an identifier: ${this.userGroups}`);
    }

  }

  public async say(message: string) {
    await this.client.say(this.config.channels[0], message);
    return;
  }

  /**
   * @method connect
   * @description connect the twitch bot to irc channel.
   * @return {Promise<void>}
   */
  public async connect(): Promise<void> {
    await this.client.connect();
    this.client.addListener('chat', (
      ch: string, user: IUser, msg: string, self: boolean, action: any) => {
      console.log(`
      user: ${user['display-name']}
      channel: ${ch}
      msg: ${msg}
      self: ${self}
      actions: ${action}
      `);
      this.botEE.emit($.IncChat, { ch, user, msg, self, action });

    });
  }

  public checkDebounce(command: string): boolean {
    try {
      const string = command.substr(1);
      if (!this.commands[string].action) return false;
      const currentTime = Date.now();
      const debounce = this.commands[string].debounce || 0;
      const timePastSinceLastExe = currentTime - this.commands[string].lastExe;
      return timePastSinceLastExe > debounce;
    } catch (e) {
      console.log(`could not execute command.`);
      return false;
    }

  }

  public checkPermissions(input: IInput): boolean {
    const string = this.normalizeMessage(input.msg).substr(1);
    switch (this.commands[string].reqRights) {
      case UserType.Normal:     return true;
      case UserType.Subscriber: return input.user.subscriber === true;
      case UserType.Mod:        return input.user.mod === true;
      default:                  return false;
    }
  }

  public isCommand(command: string): boolean {
    // See if input message begins with command character &&
    // See if input message is longer than command character.
    return command[0] === this.config.commandCharacter &&
           command.trim().length > this.config.commandCharacter.length;
  }

  /**
   * @method normalizeCommand
   * @description Used to trim and lowercase incoming messages
   *              before attempting to call them in list of commands.
   * @param {string} inputMsg - message that needs to be converted.
   * @return {string} - return command.
   */
  public normalizeMessage(inputMsg: string): string {
    const msgArray = inputMsg.trim().split(' ');
    const msg = msgArray[0];
    return msg.toLowerCase();
  }
}
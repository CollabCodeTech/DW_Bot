import { IPayload, IUser, TwitchBot } from '../bot';
import { hasBits, putBits } from '../services/user.service';
import * as moment from 'moment';
import * as _ from 'lodash';

export type ObjTypes =  0 | 1 | 2 | 3 | 4 | 5;

export interface IBetter {
  name: string;
  team: 'red' | 'blue';
  amount: number;
  winnings: number;
  mods: {
    objectives: ObjTypes | number;
    strikes: false | string;
  };
}

interface IPool {
  open: boolean;
  openTime: number;
  gameId: number;
  bets: IBetter[];
}

const maxBet = 10000;
const minBet = 10;

const bettingDuration = moment.duration(10, 'minutes');

export class BettingPlugin {
  public oddValues =
    [(1 / 2), (3 / 5), (4 / 5), (5 / 5), (7 / 5), (10 / 5)];
  private pool: IPool = {
    open: false,
    openTime: -1,
    gameId: -1,
    bets: [],
  };

  constructor(private bot: TwitchBot) {
    bot.addCommand('*testBet', (p: IPayload) => {
      bot.say('test bet command');
    });
  }

  private async addBet(better: IBetter) {
    // check if user already has bet.
    if (this.hasBet(better.name)) await this.removeBet(better.name);
    // check if user has enough bits to bet that amount.
    if (await !hasBits(better.name, better.amount)) return;
    putBits(better.name, better.amount)
      .then(() => {
        this.pool.bets.push(better);
      })
      .catch((e) => {
        this.bot.whisperQueue(better.name, 'Something went wrong with adding' +
          'your bet.');
        // TODO: internal error reporter
      });

  }

  /**
   * @method formatBetter
   * @description This function will make sure amount is valid &
   *              format Better before putting it is placed into pool.
   * @param {string} name - better username.
   * @param {array} args - arguments from payload.
   *
   */
  private formatBetter(name: string, ...args: any[]): false | IBetter {
    const [amount, team, ...modifiers] = args;
    if (this.validAmount(amount) === false) return false;
    const obj = modifiers[0] || false;
    const strikes = modifiers[1] || false;
    return {
      name,
      team,
      amount,
      winnings: 0,
      mods: {
        strikes: this.validStrikes(strikes),
        objectives: this.validObjective(obj),
      },
    };
  }

  private validAmount(amount: any): false | number {
    try {
      // TODO: support #k format.
      const number = Number(amount.toString().replace(/,/g, ''));
      if (isNaN(number)) return false;
      if (number % 1 !== 0) return false;
      if (number < minBet) return false;
      if (number > maxBet) return false;
      return number;
    } catch (e) { return false; }
  }

  private validStrikes(strikes: any): false | string {
    if (
      strikes === 'x' ||
      strikes === 'xx' ||
      strikes === 'xxx'
    ) return strikes;
    return false;
  }

  /**
   * @method oddsWinnings
   * @description Winnings based on objective odds.
   * @param {IBetter} better - Better object.
   * @return {number} - amount player should earned if guessed correctly.
   */
  private oddsWinnings(better: IBetter): number {
    const betAmount = better.amount;
    const objPrediction = better.mods.objectives;
    return betAmount * this.oddValues[objPrediction];
  }

  private validObjective(objective: any): ObjTypes | number {
    if (objective === 'ace') return 5;
    if (objective === false) return 0;
    const number = Number(objective);
    if (isNaN(number) || number < 0 || number > 5) {
      return 0;
    }
    return number;
  }

  /**
   * @method hasBet
   * @description method used for determining of user already has a placed bet.
   * @return {false | number} - returns false if bet was not found,
   *                              returns index number if bet is found.
   */
  private hasBet(name: string): false | number {
    const idx = _.findIndex(this.pool.bets, (b: IBetter) => b.name === name);
    return idx !== -1 ? idx : false;
  }

  private async removeBet(name: string): Promise<void> {
    this.pool.bets = _.remove(this.pool.bets, (b: IBetter) => b.name === name);

    return;
  }

  /**
   * @method returnBet
   * @param {number} index - Position
   * @return {Promise<void>}
   */
  private async returnBet(index: number): Promise<void> {

  }
}

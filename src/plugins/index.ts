import { DPayload, IPayload } from '../interfaces';
import {  TwitchBot } from '../twitch.bot';
import { BettingPlugin } from './betting.plugin';
import {
  getBits, user,
} from '../services/user.service';
import {
  addTime, emptyFrameBetters, listenForStageChange, resetFrame, startTimer,
  switchStage,
} from '../services/firebase.service';
import { getStreamInfo } from '../services/twitch.service';
import { currentGame } from '../services/game.service';
import { BPMPlugin } from './bpm.plugin';
import { VotingPlugin } from './voting.plugin';
import { ApplyPlugin } from './apply.plugin';
import { AnalyticsPlugin } from './analytics.plugin';
import { channels, DiscordBot } from '../discord.bot';
import botUtils from '../common/bot.utils';
import { PollPlugin } from './poll.plugin';

const plugins = (twitch: TwitchBot, discord: DiscordBot) => {
  let listenForChanges = false;
  new BettingPlugin(twitch);
  new BPMPlugin(twitch);
  new VotingPlugin(twitch);
  new ApplyPlugin(twitch, discord);
  new AnalyticsPlugin();
  new PollPlugin(twitch);

  listenForStageChange((state) => {
    // don't listen for changes on bot bootup.
    if (listenForChanges === false) {
      return listenForChanges = true;
    }
    if (state === 'running') {
      return twitch.selfCommand('!startgame');
    }
  });

  twitch.addCommand('@startgame', async () => {
    try {
      const game = await currentGame();
      botUtils.sysLog('info', `starting: ${JSON.stringify(game)}`, '~');
      const theme = game.name || 'Classic';
      await Promise
        .all([switchStage('objective'), startTimer()]);

      await twitch.say('Starting Game!');

      switch (theme.toLowerCase()) {
        case 'blitz':
          await twitch.say('betting will open in 2 minutes!');
          setTimeout(() => twitch.selfCommand('!openbets 3'), botUtils.ms({ minutes: 2 }));
          break;
        case 'classic':
          await twitch.say('betting will open in 5 minutes!');
          setTimeout(() => twitch.selfCommand('!openbets 10'), botUtils.ms({ minutes: 5 }));
          break;
        case 'zen garden':
          return twitch.say('bets are closed for this game.');
      }

    } catch (e) {
      botUtils.sysLog('error', 'Problems with startGame command', '~', e);
    }
  });

  twitch.addCommand(['*coins', '*devcoins'], async (p:IPayload) => {
    const bits = await getBits(p.user.username);
    const commaSep = botUtils.thousands(bits);
    return p.reply(`devwarsCoin ${commaSep}`);
    // return twitch.say(`${o.user.username}: devwarsCoin ${commaSep}`);
  });

  discord.addCommand(['*coins', '*devcoins'], async (p:DPayload) => {
    try {
      const { ranking: { bits } } = await user(p.user.id, 'discord');
      const commaSep = botUtils.thousands(Number(bits));
      return p.reply(`${commaSep} coins.`);
    } catch (e) {
      return p.reply('You may need to connect your account.');
    }

  });

  twitch.addCommand('@stage', async (o:IPayload) => {
    const stage = o.args[0] || 'objective';
    return switchStage(stage);
  });

  twitch.addCommand('@addtime', async (o:IPayload) => {
    // user input will be in minute format. So !addtime 1 should add 1m.
    const ms = Math.floor(o.args[0] * 60 * 1000);
    return addTime(ms);
  });

  twitch.addCommand('@channel', async () => {
    return getStreamInfo('beleek');
  });

  twitch.addCommand('@endgame', async () => {
    return await resetFrame();
  });

  twitch.addCommand('*livecode', () =>
    twitch.say('Watch the code in real-time https://watch.devwars.tv'),
    botUtils.ms({ seconds: 15 }));

  twitch.addCommand('*watchred', () =>
    twitch.say('View Red Team\'s website https://red.devwars.tv'), botUtils.ms({ seconds: 15 }));

  twitch.addCommand('*watchblue', () =>
    twitch.say('View Blue Team\'s website https://blue.devwars.tv'), botUtils.ms({ seconds: 15 }));

  twitch.addCommand('*watch', () => {
    twitch.say('View Code: https://watch.devwars.tv | View Red website: https://red.devwars.tv | View Blue website: https://blue.devwars.tv');
  }, botUtils.ms({ seconds: 15 }));

  twitch.addCommand('*discord', () =>
    twitch.say('https://discord.gg/devwars'), botUtils.ms({ seconds: 15 }));

  twitch.addCommand('*fire', p =>
    p.reply('🔥'), botUtils.ms({ minutes: 30 }));

  twitch.addCommand('@emptyframepool', () => emptyFrameBetters());

  // example of self command:
  twitch.addCommand('@mirrormirror', async () => {
    return twitch.say('...on the wall');
  });
  twitch.addCommand('@selfCommand', async () => {
    return twitch.selfCommand('!mirrormirror');
  });

  // discord.addCommand('*ping', async () => {
  //   return discord.say('pong', channels.bot_testing);
  // });

  // discord.addCommand('@mod', async (o:DPayload) => {
  //   discord.say('saying something', channels.bot_testing);
  //   return o.reply('confirmed mod');
  // });
};

export default plugins;

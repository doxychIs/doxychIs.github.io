import test from 'node:test';
import assert from 'node:assert/strict';
import { YandexPlatform } from '../src/platform.js';

test('Без SDK нет фальшивой рекламы, наград или облачного сохранения',async()=>{
  const platform=new YandexPlatform();
  assert.equal(await platform.loadCloud(),null);assert.equal(await platform.saveCloud({money:10}),false);
  assert.deepEqual(await platform.showRewarded(),{shown:false,rewarded:false});
  assert.deepEqual(await platform.showFullscreen(),{shown:false,rewarded:false});
});

test('Награда только по onRewarded, игра возобновляется после рекламы',async()=>{
  let callback;let pauses=0,resumes=0;
  const platform=new YandexPlatform({onPause:()=>pauses++,onResume:()=>resumes++});
  platform.sdk={adv:{showRewardedVideo:({callbacks})=>{callback=callbacks;}}};
  const reward=platform.showRewarded();callback.onOpen();callback.onRewarded();callback.onClose();
  assert.deepEqual(await reward,{shown:true,rewarded:true});assert.equal(pauses,1);assert.equal(resumes,1);
  const skip=platform.showRewarded();callback.onOpen();callback.onClose();assert.equal((await skip).rewarded,false);
  const error=platform.showRewarded();callback.onError();assert.deepEqual(await error,{shown:false,rewarded:false});
});

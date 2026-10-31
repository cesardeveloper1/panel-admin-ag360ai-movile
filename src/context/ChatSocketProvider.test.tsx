import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { ChatSocketProvider } from './ChatSocketProvider';
import { useChatSocket } from '../hooks/useChatSocket';
import '../i18n';
const state=vi.hoisted(()=>({handlers:new Map<string,Set<(event?:unknown)=>void>>(),emit:vi.fn(),disconnect:vi.fn(),changed:vi.fn()}));
vi.mock('socket.io-client',()=>({io:()=>({connected:false,emit:state.emit,disconnect:state.disconnect,
 on:(event:string,fn:(event?:unknown)=>void)=>{if(!state.handlers.has(event))state.handlers.set(event,new Set());state.handlers.get(event)!.add(fn);},
 off:(event:string,fn:(event?:unknown)=>void)=>{state.handlers.get(event)?.delete(fn);}})}));
vi.mock('../config/env',()=>({config:{useApiMock:false,environment:'production'}}));
vi.mock('../hooks/useAuthToken',()=>({useAuthToken:()=> 'test-only'}));
const session={role:'owner'};const brand={id:'demo',subdomain:'demo'};
vi.mock('../hooks/useApp',()=>({useApp:()=>({session,brand})}));
vi.mock('../utils/resolveSocketBaseUrl',()=>({resolveSocketBaseUrl:()=> 'http://example.invalid'}));
vi.mock('../notifications/deliverNotificationCue',()=>({acceptCue:()=>false,deliverNotificationCue:vi.fn(),startNotificationCues:vi.fn()}));
vi.mock('../notifications/notificationCues',()=>({chatCueForNewMessage:()=>null,chatCueForTransition:()=>null,resolveChatSoundKey:()=>null}));
function Probe(){const {subscribeOperationsChanged}=useChatSocket();useEffect(()=>subscribeOperationsChanged(state.changed),[subscribeOperationsChanged]);return null;}
afterEach(()=>{cleanup();state.handlers.clear();vi.clearAllMocks();});
it('subscribes on connect and delivers Operations wakeups through the shared connection',async()=>{
 const view=render(<ChatSocketProvider><Probe/></ChatSocketProvider>);
 await waitFor(()=>expect(state.handlers.has('connect')).toBe(true));
 state.handlers.get('connect')!.forEach(fn=>fn());
 expect(state.emit).toHaveBeenCalledWith('operations:subscribe',{resource:'conversations',subDomain:'demo'});
 const before=state.changed.mock.calls.length;
 state.handlers.get('operations:wakeup')!.forEach(fn=>fn());
 expect(state.changed).toHaveBeenCalledTimes(before+1);
 state.handlers.get('conversationReset')!.forEach(fn=>fn({subDomain:'other'}));
 expect(state.changed).toHaveBeenCalledTimes(before+1);
 view.unmount();expect(state.handlers.get('operations:wakeup')?.size).toBe(0);
});

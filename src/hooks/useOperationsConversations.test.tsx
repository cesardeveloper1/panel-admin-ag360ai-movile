import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useOperationsConversations } from './useOperationsConversations';
import { readConversationPage } from '../services/operationsConversations';
import type { ContactInfo } from '../types/contact';
const socket = vi.hoisted(() => ({listener: () => {}, stop: vi.fn(), subscribe: vi.fn()}));
vi.mock('./useChatSocket', () => ({useChatSocket: () => ({subscribeOperationsChanged: socket.subscribe})}));
vi.mock('../services/operationsConversations', () => ({readConversationPage: vi.fn()}));
afterEach(() => {cleanup();vi.clearAllMocks();});
const contact = {_id:'demo',subDomain:'demo',clientName:'Before'} as ContactInfo;
function setup() {
 socket.subscribe.mockImplementation((fn:()=>void) => {socket.listener=fn;return socket.stop;});
 vi.mocked(readConversationPage).mockImplementation(async (_filters,stage) => ({items:stage==='INICIAL'?[contact]:[],total:stage==='INICIAL'?150:0,hasMore:false,nextCursor:null}));
}
it('refreshes changed cards and server totals on a socket wakeup without manual reload', async () => {
 setup();
 const view=renderHook(()=>useOperationsConversations({subDomain:'demo'},'auth1',true));
 await waitFor(()=>expect(view.result.current.loading).toBe(false));
 expect(view.result.current.columns.INICIAL.total).toBe(150);
 vi.mocked(readConversationPage).mockImplementation(async (_filters,stage) => ({items:stage==='PIDIENDO'?[{...contact,clientName:'After'}]:[],total:stage==='PIDIENDO'?1:0,hasMore:false,nextCursor:null}));
 act(()=>{socket.listener();socket.listener();socket.listener();});
 await waitFor(()=>expect(view.result.current.columns.PIDIENDO.items[0]?.clientName).toBe('After'));
 expect(view.result.current.columns.INICIAL.items).toEqual([]);
 expect(readConversationPage).toHaveBeenCalledTimes(8);
});
it('discards an old scope response and rechecks server membership on focus', async () => {
 setup();
 let release!: (value:Awaited<ReturnType<typeof readConversationPage>>) => void;
 vi.mocked(readConversationPage).mockImplementation((_f,stage)=>stage==='INICIAL'?new Promise(resolve=>{release=resolve;}):Promise.resolve({items:[],total:0,hasMore:false,nextCursor:null}));
 const view=renderHook(({scope})=>useOperationsConversations({subDomain:scope},scope,true),{initialProps:{scope:'old'}});
 await waitFor(()=>expect(readConversationPage).toHaveBeenCalledTimes(4));
 vi.mocked(readConversationPage).mockResolvedValue({items:[],total:0,hasMore:false,nextCursor:null});
 view.rerender({scope:'new'});
 await act(async()=>release({items:[contact],total:1,hasMore:false,nextCursor:null}));
 await waitFor(()=>expect(view.result.current.loading).toBe(false));
 expect(view.result.current.columns.INICIAL.items).toEqual([]);
 const calls=vi.mocked(readConversationPage).mock.calls.length;
 act(()=>window.dispatchEvent(new Event('focus')));
 await waitFor(()=>expect(readConversationPage).toHaveBeenCalledTimes(calls+4));
});
it('clears inaccessible cards on reconciliation failure and unsubscribes on unmount', async () => {
 setup();const view=renderHook(()=>useOperationsConversations({subDomain:'demo'},'auth1',true));
 await waitFor(()=>expect(view.result.current.loading).toBe(false));
 vi.mocked(readConversationPage).mockRejectedValue({statusCode:403});
 act(()=>socket.listener());
 await waitFor(()=>expect(view.result.current.error).toBe(true));
 expect(view.result.current.columns.INICIAL.items).toEqual([]);
 view.unmount();expect(socket.stop).toHaveBeenCalledOnce();
});

it('loads more with the opaque cursor and keeps the authoritative total during refresh', async () => {
 setup();
 vi.mocked(readConversationPage).mockImplementation(async (_filters,stage,cursor) => ({items:stage==='INICIAL'?[{...contact,_id:cursor?'second':'first'}]:[],total:cursor?null:80,hasMore:stage==='INICIAL'&&!cursor,nextCursor:stage==='INICIAL'&&!cursor?'page2':null}));
 const view=renderHook(()=>useOperationsConversations({subDomain:'demo',branchId:'b'},'auth',true));
 await waitFor(()=>expect(view.result.current.loading).toBe(false));
 act(()=>view.result.current.loadMore('INICIAL'));
 await waitFor(()=>expect(view.result.current.columns.INICIAL.items).toHaveLength(2));
 expect(view.result.current.columns.INICIAL.total).toBe(80);
 act(()=>socket.listener());
 await waitFor(()=>expect(readConversationPage).toHaveBeenCalledTimes(10));
 expect(view.result.current.columns.INICIAL.items.map(item=>item._id)).toEqual(['first','second']);
});

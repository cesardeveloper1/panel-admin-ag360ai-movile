import { expect, it, vi } from 'vitest';
import { readConversationPage } from './operationsConversations';
import { api } from './api';
vi.mock('./api',()=>({api:{get:vi.fn()}}));
vi.mock('../config/env',()=>({config:{useApiMock:false}}));
it('uses the operations stage, 12h window, scope, channel, search and first-page total',async()=>{
 vi.mocked(api.get).mockResolvedValue({data:{items:[],total:42,hasMore:false,nextCursor:null}});
 const result=await readConversationPage({subDomain:'demo',branchId:'branch',channel:'messenger',search:'a & b'},'PIDIENDO');
 const url=new URL(vi.mocked(api.get).mock.calls.at(-1)![0],'https://example.invalid');
 expect(url.pathname).toBe('/operations/conversations');
 expect(Object.fromEntries(url.searchParams)).toMatchObject({subDomain:'demo',stage:'pidiendo',funnelWindow:'12h',clientGroup:'clients',branchId:'branch',branchScope:'branch',channel:'messenger',search:'a & b',includeTotal:'true'});
 expect(result.total).toBe(42);
});
it('keeps opaque cursors and requests totals only on the first page',async()=>{
 vi.mocked(api.get).mockResolvedValue({data:{items:[],total:null,hasMore:false,nextCursor:null}});
 await readConversationPage({subDomain:'demo'},'INICIAL','opaque+cursor=');
 const url=new URL(vi.mocked(api.get).mock.calls.at(-1)![0],'https://example.invalid');
 expect(url.searchParams.get('cursor')).toBe('opaque+cursor=');
 expect(url.searchParams.get('includeTotal')).toBe('false');
});
it('rejects malformed pages rather than reporting an empty successful funnel',async()=>{
 vi.mocked(api.get).mockResolvedValue({data:{items:[],hasMore:true,nextCursor:null}});
 await expect(readConversationPage({subDomain:'demo'},'HUMANO')).rejects.toThrow('Invalid operations');
});

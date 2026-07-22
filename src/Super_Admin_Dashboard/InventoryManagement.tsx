import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config';
import './StaffList.css';
import './ManagementTabs.css';

type Tab = 'dashboard'|'categories'|'vendors'|'products'|'variants'|'books'|'materials'|'bookKits'|'uniformKits'|'purchases'|'stock'|'orders'|'issue'|'returns'|'payments'|'reports'|'settings';
interface Field { key:string; label:string; type?:string; required?:boolean }
interface Config { label:string; endpoint?:string; fields?:Field[] }

const tabs:Record<Tab,Config>={
 dashboard:{label:'Dashboard'},
 categories:{label:'Categories',endpoint:'categories',fields:[{key:'name',label:'Category Name',required:true},{key:'description',label:'Description'}]},
 vendors:{label:'Vendors',endpoint:'vendors',fields:[{key:'vendorName',label:'Vendor Name',required:true},{key:'contactPerson',label:'Contact Person'},{key:'mobile',label:'Mobile',required:true},{key:'gstNumber',label:'GST Number'},{key:'email',label:'Email',type:'email'},{key:'address',label:'Address'}]},
 products:{label:'Products',endpoint:'products',fields:[{key:'productCode',label:'Product Code',required:true},{key:'productName',label:'Product Name',required:true},{key:'categoryId',label:'Category ID',type:'number',required:true},{key:'brand',label:'Brand'},{key:'unit',label:'Unit'},{key:'hsnCode',label:'HSN Code'},{key:'purchasePrice',label:'Purchase Price',type:'number'},{key:'sellingPrice',label:'Selling Price',type:'number',required:true},{key:'gstPercent',label:'GST %',type:'number'},{key:'minimumStock',label:'Minimum Stock',type:'number'},{key:'barcode',label:'Barcode'}]},
 variants:{label:'Uniforms / Variants',endpoint:'variants',fields:[{key:'productId',label:'Product Name',type:'number',required:true},{key:'variantName',label:'Size / Variant',required:true},{key:'sku',label:'SKU'},{key:'barcode',label:'Barcode'},{key:'priceAdjustment',label:'Price Adjustment',type:'number'}]},
 books:{label:'Books',endpoint:'books',fields:[{key:'productId',label:'Book Name',type:'number',required:true},{key:'academicSessionId',label:'Academic Session',type:'number',required:true},{key:'classId',label:'Class Name',type:'number'},{key:'sectionId',label:'Section Name',type:'number'},{key:'subjectId',label:'Subject Name',type:'number'},{key:'publisher',label:'Publisher'},{key:'edition',label:'Edition'},{key:'isbn',label:'ISBN'}]},
 materials:{label:'Study Materials',endpoint:'products'},
 bookKits:{label:'Book Kits',endpoint:'kits',fields:[{key:'kitName',label:'Kit Name',required:true},{key:'academicSessionId',label:'Academic Session',type:'number',required:true},{key:'classId',label:'Class Name',type:'number'},{key:'discountAmount',label:'Discount',type:'number'}]},
 uniformKits:{label:'Uniform Kits',endpoint:'kits',fields:[{key:'kitName',label:'Kit Name',required:true},{key:'academicSessionId',label:'Academic Session',type:'number',required:true},{key:'classId',label:'Class Name',type:'number'},{key:'discountAmount',label:'Discount',type:'number'}]},
 purchases:{label:'Purchase Orders',endpoint:'purchase-orders'}, stock:{label:'Stock Management',endpoint:'stock'},
 orders:{label:'Student Orders',endpoint:'orders'}, issue:{label:'Issue to Students',endpoint:'orders'},
 returns:{label:'Returns & Exchanges',endpoint:'returns'}, payments:{label:'Billing & Payments',endpoint:'payments'},
 reports:{label:'Reports',endpoint:'reports'}, settings:{label:'Settings'}
};
const human=(s:string)=>s.replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase());
const show=(v:any)=>v==null||v===''?'-':typeof v==='boolean'?(v?'Active':'Inactive'):typeof v==='object'?JSON.stringify(v):(/^\d{4}-\d{2}-\d{2}T/.test(String(v))?new Date(v).toLocaleDateString('en-GB'):String(v));

const INVENTORY_TABS:Tab[]=['dashboard','categories','vendors','products','purchases','stock','orders','issue','returns','payments','reports','settings'];
const STUDY_MATERIAL_TABS:Tab[]=['dashboard','books','materials','variants','bookKits','uniformKits'];

const InventoryManagement:React.FC<{selectedSchoolId:number|null; mode?:'inventory'|'studyMaterials'}>=({selectedSchoolId,mode='inventory'})=>{
 const [tab,setTab]=useState<Tab>('dashboard'),[rows,setRows]=useState<any[]>([]),[summary,setSummary]=useState<any>({});
 const [form,setForm]=useState<Record<string,string>>({}),[open,setOpen]=useState(false),[loading,setLoading]=useState(false),[message,setMessage]=useState('');
 const [lookups,setLookups]=useState<{products:any[];categories:any[];classes:any[];sections:any[];sessions:any[];subjects:any[]}>({products:[],categories:[],classes:[],sections:[],sessions:[],subjects:[]});
 const cfg=tabs[tab];
 const headers=()=>({accept:'application/json',Authorization:`Bearer ${localStorage.getItem('token')}`,'Content-Type':'application/json'});
 const visibleTabs=mode==='studyMaterials'?STUDY_MATERIAL_TABS:INVENTORY_TABS;
 useEffect(()=>{setTab('dashboard');setOpen(false);setMessage('');},[mode]);
 useEffect(()=>{if(selectedSchoolId)loadLookups();},[selectedSchoolId]); // eslint-disable-line
 useEffect(()=>{if(selectedSchoolId)load();},[selectedSchoolId,tab]); // eslint-disable-line
 const load=async()=>{if(!selectedSchoolId)return;const endpoint=tab==='dashboard'?'dashboard':cfg.endpoint;if(!endpoint){setRows([]);return;}try{setLoading(true);setMessage('');const r=await fetch(`${API_BASE_URL}/api/Inventory/${endpoint}?schoolId=${selectedSchoolId}`,{cache:'no-store',headers:headers()});const ct=r.headers.get('content-type')||'';if(!ct.includes('application/json'))throw new Error(`Inventory API returned a non-JSON response (${r.status}).`);const j=await r.json();if(!r.ok)throw new Error(j.message||'Unable to load inventory.');if(tab==='dashboard'||tab==='reports')setSummary(j.data||{});else setRows(j.data||[]);}catch(e){setMessage(e instanceof Error?e.message:'Unable to load inventory.');}finally{setLoading(false);}};
 const loadLookups=async()=>{if(!selectedSchoolId)return;try{const [productRes,categoryRes,enrollmentRes,subjectRes]=await Promise.all([
   fetch(`${API_BASE_URL}/api/Inventory/products?schoolId=${selectedSchoolId}`,{headers:headers()}),
   fetch(`${API_BASE_URL}/api/Inventory/categories?schoolId=${selectedSchoolId}`,{headers:headers()}),
   fetch(`${API_BASE_URL}/api/Student/enrollment-info?schoolId=${selectedSchoolId}`,{headers:headers()}),
   fetch(`${API_BASE_URL}/api/Subject/subjects-by-school?schoolId=${selectedSchoolId}&page=1&pageSize=1000`,{headers:headers()})]);
  const [products,categories,enrollment,subjects]=await Promise.all([productRes.json(),categoryRes.json(),enrollmentRes.json(),subjectRes.json()]);
  setLookups({products:products.data||[],categories:categories.data||[],classes:enrollment.data?.classes||[],sections:enrollment.data?.sections||[],sessions:enrollment.data?.sessions||[],subjects:subjects.data||[]});
 }catch(e){console.error('Failed to load inventory form options',e);}};
 const fieldOptions=(key:string):{value:string;label:string}[]=>{
  if(key==='productId')return lookups.products.map(x=>({value:String(x.id),label:`${x.productName} (${x.productCode})`}));
  if(key==='categoryId')return lookups.categories.map(x=>({value:String(x.id),label:x.name}));
  if(key==='academicSessionId')return lookups.sessions.map(x=>({value:String(x.id),label:`${String(x.yearStart).slice(0,4)}-${String(x.yearEnd).slice(0,4)}`}));
  if(key==='classId')return lookups.classes.map(x=>({value:String(x.id),label:x.name}));
  if(key==='sectionId')return lookups.sections.filter(x=>!form.classId||x.classId===Number(form.classId)).map(x=>({value:String(x.id),label:x.name}));
  if(key==='subjectId')return lookups.subjects.map(x=>({value:String(x.id),label:x.subjectName}));
  return [];
 };
 const save=async(e:React.FormEvent)=>{e.preventDefault();if(!selectedSchoolId||!cfg.fields||!cfg.endpoint)return;const body:any={schoolId:selectedSchoolId,isActive:true};cfg.fields.forEach(f=>body[f.key]=f.type==='number'?Number(form[f.key]||0):(form[f.key]||null));if(tab==='bookKits')body.kitType='Book';if(tab==='uniformKits')body.kitType='Uniform';try{const r=await fetch(`${API_BASE_URL}/api/Inventory/${cfg.endpoint}`,{method:'POST',headers:headers(),body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw new Error(j.message||'Unable to save.');setMessage(j.message);setForm({});setOpen(false);await load();}catch(e){setMessage(e instanceof Error?e.message:'Unable to save.');}};
 const cols=useMemo(()=>rows.length?Object.keys(rows[0]).filter(x=>!['id','schoolId'].includes(x)).slice(0,9):[],[rows]);
 if(!selectedSchoolId)return <div className="staff-list-loading">Please select a school</div>;
 const cards=[['Total Products',summary.totalProducts],['Books',summary.totalBooks],['Uniforms',summary.totalUniforms],['Study Materials',summary.totalStudyMaterials],['Low Stock',summary.lowStockItems],['Today Sales',`Rs. ${Number(summary.todaySales||0).toLocaleString()}`],['Pending Payments',`Rs. ${Number(summary.pendingPayments||0).toLocaleString()}`],['Monthly Revenue',`Rs. ${Number(summary.monthlyRevenue||0).toLocaleString()}`]];
 return <div className="staff-list-container"><div className="staff-list-header"><h2>{mode==='studyMaterials'?'Study Materials':'School Store / Inventory'}</h2></div>
  <div className="management-tabs inventory-tabs" role="tablist">{visibleTabs.map(k=><button key={k} role="tab" type="button" aria-selected={tab===k} className={`management-tab ${tab===k?'active':''}`} onClick={()=>{setTab(k);setOpen(false);setMessage('');}}>{tabs[k].label}</button>)}</div>
  {message&&<div style={{padding:'10px 14px',marginBottom:'14px',borderRadius:'8px',background:'#edf2f7'}}>{message}</div>}
  {tab==='dashboard'?<div className="stats-grid">{cards.map(([l,v])=><div className="stat-card" key={String(l)}><div className="stat-header"><span>{l}</span></div><div className="stat-value">{v??0}</div></div>)}</div>
  :tab==='settings'?<div className="staff-list-loading">Configure barcode prefixes, invoice numbering, tax defaults, roles and low-stock notification thresholds here.</div>
  :tab==='reports'?<div className="stats-grid">{[['Inventory Value',summary.inventoryValue],['Sales Value',summary.salesValue],['Collected',summary.collected],['Low Stock',summary.lowStock]].map(([l,v])=><div className="stat-card" key={String(l)}><div className="stat-header"><span>{l}</span></div><div className="stat-value">{l==='Low Stock'?v:`Rs. ${Number(v||0).toLocaleString()}`}</div></div>)}</div>
  :<>{cfg.fields&&<div style={{display:'flex',justifyContent:'flex-end',marginBottom:'16px'}}><button className="btn btn-primary" onClick={()=>setOpen(!open)}>{open?'Close':`+ Add ${cfg.label}`}</button></div>}
   {open&&cfg.fields&&<form onSubmit={save} className="form-grid" style={{padding:'20px',marginBottom:'20px',border:'1px solid #e2e8f0',borderRadius:'12px'}}>{cfg.fields.map(f=>{const options=fieldOptions(f.key);return <div className="form-group" key={f.key}><label>{f.label.replace(' ID','')}{f.required?' *':''}</label>{options.length>0||['productId','categoryId','academicSessionId','classId','sectionId','subjectId'].includes(f.key)?<select required={f.required} value={form[f.key]||''} disabled={f.key==='sectionId'&&!form.classId} onChange={e=>setForm({...form,[f.key]:e.target.value,...(f.key==='classId'?{sectionId:''}:{})})}><option value="">Select {f.label.replace(' ID','')}</option>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:<input type={f.type||'text'} required={f.required} value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})}/>}</div>})}<div className="form-group"><button className="btn btn-primary" type="submit">Save</button></div></form>}
   {loading?<div className="staff-list-loading">Loading...</div>:rows.length===0?<div className="staff-list-loading">No records found.</div>:<div className="staff-table-wrapper"><table className="staff-table"><thead><tr>{cols.map(c=><th key={c}>{human(c)}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.id??i}>{cols.map(c=><td key={c}>{show(r[c])}</td>)}</tr>)}</tbody></table></div>}</>}
 </div>;
};
export default InventoryManagement;

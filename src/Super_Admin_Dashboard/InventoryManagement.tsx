import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config';
import { useToastMessageState } from '../components/Toast/Toast';
import Modal from './Modal';
import './StaffList.css';
import './ManagementTabs.css';

type Tab = 'dashboard'|'categories'|'vendors'|'products'|'variants'|'books'|'materials'|'bookKits'|'uniformKits'|'purchases'|'stock'|'orders'|'returns'|'payments'|'reports'|'settings';
interface Field { key:string; label:string; type?:string; required?:boolean; optionsKey?:string; help?:string }
interface Config { label:string; endpoint?:string; postEndpoint?:string; fields?:Field[] }

const tabs:Record<Tab,Config>={
 dashboard:{label:'Dashboard'},
 categories:{label:'Categories',endpoint:'categories',fields:[{key:'name',label:'Category Name',required:true},{key:'description',label:'Description'}]},
 vendors:{label:'Vendors',endpoint:'vendors',fields:[{key:'vendorName',label:'Vendor Name',required:true},{key:'contactPerson',label:'Contact Person'},{key:'mobile',label:'Mobile',required:true},{key:'gstNumber',label:'GST Number'},{key:'email',label:'Email',type:'email'},{key:'address',label:'Address'}]},
 products:{label:'Products',endpoint:'products',fields:[{key:'productCode',label:'Product Code',required:true,help:'A unique code used to identify this product in inventory, purchases, and orders.'},{key:'productName',label:'Product Name',required:true},{key:'categoryId',label:'Category ID',type:'number',required:true},{key:'brand',label:'Brand'},{key:'unit',label:'Quantity'},{key:'hsnCode',label:'HSN Code'},{key:'purchasePrice',label:'Purchase Price',type:'number'},{key:'gstPercent',label:'GST %',type:'number'}]},
 variants:{label:'Uniforms / Variants',endpoint:'variants',fields:[{key:'productId',label:'Product Name',type:'number',required:true},{key:'variantName',label:'Size / Variant',required:true},{key:'sku',label:'SKU'},{key:'barcode',label:'Barcode'},{key:'priceAdjustment',label:'Price Adjustment',type:'number'}]},
 books:{label:'Books',endpoint:'books',fields:[{key:'productId',label:'Book Name',type:'number',required:true},{key:'academicSessionId',label:'Academic Session',type:'number',required:true},{key:'classId',label:'Class Name',type:'number'},{key:'sectionId',label:'Section Name',type:'number'},{key:'subjectId',label:'Subject Name',type:'number'},{key:'publisher',label:'Publisher'},{key:'edition',label:'Edition'},{key:'isbn',label:'ISBN'}]},
 materials:{label:'Study Materials',endpoint:'products'},
 bookKits:{label:'Book Kits',endpoint:'kits',fields:[{key:'kitName',label:'Kit Name',required:true},{key:'academicSessionId',label:'Academic Session',type:'number',required:true},{key:'classId',label:'Class Name',type:'number'},{key:'discountAmount',label:'Discount',type:'number'}]},
 uniformKits:{label:'Uniform Kits',endpoint:'kits',fields:[{key:'kitName',label:'Kit Name',required:true},{key:'academicSessionId',label:'Academic Session',type:'number',required:true},{key:'classId',label:'Class Name',type:'number'},{key:'discountAmount',label:'Discount',type:'number'}]},
 purchases:{label:'Purchases',endpoint:'purchase-orders',fields:[{key:'vendorId',label:'Vendor',type:'select',optionsKey:'vendors',required:true},{key:'purchaseDate',label:'Purchase Date',type:'date',required:true},{key:'invoiceNumber',label:'Invoice Number'},{key:'productId',label:'Product',type:'select',optionsKey:'products',required:true},{key:'quantity',label:'Purchased Quantity',type:'number',required:true},{key:'rate',label:'Purchase Rate',type:'number',required:true},{key:'gstPercent',label:'GST %',type:'number'},{key:'discount',label:'Discount',type:'number'}]},
 stock:{label:'Manage Stock',endpoint:'stock'},
 orders:{label:'Student Orders',endpoint:'orders',fields:[{key:'academicSessionId',label:'Academic Session',type:'select',optionsKey:'sessions',required:true},{key:'classId',label:'Class',type:'select',required:true},{key:'sectionId',label:'Section',type:'select',required:true},{key:'studentId',label:'Student',type:'select',optionsKey:'students',required:true},{key:'orderType',label:'Order Type',type:'select',optionsKey:'orderTypes',required:true},{key:'borrowDateTime',label:'Borrow Date & Time',type:'datetime-local'},{key:'returnDateTime',label:'Return Date & Time',type:'datetime-local'},{key:'productId',label:'Product',type:'select',optionsKey:'products',required:true},{key:'quantity',label:'Quantity',type:'number',required:true},{key:'unitPrice',label:'Unit Price',type:'number'},{key:'discount',label:'Discount',type:'number'}]},
 returns:{label:'Returns & Exchanges',endpoint:'returns',fields:[{key:'studentOrderId',label:'Issued Order',type:'select',optionsKey:'issuedOrders',required:true},{key:'productId',label:'Returned Product',type:'select',optionsKey:'products',required:true},{key:'quantity',label:'Quantity',type:'number',required:true},{key:'condition',label:'Condition',type:'select',optionsKey:'conditions',required:true},{key:'restock',label:'Restock?',type:'select',optionsKey:'yesNo',required:true},{key:'reason',label:'Return Reason',required:true}]},
 payments:{label:'Billing & Payments',endpoint:'payments',fields:[{key:'studentOrderId',label:'Outstanding Order',type:'select',optionsKey:'outstandingOrders',required:true},{key:'amount',label:'Amount',type:'number',required:true},{key:'paymentDate',label:'Payment Date',type:'datetime-local',required:true},{key:'paymentMode',label:'Payment Mode',type:'select',optionsKey:'paymentModes',required:true},{key:'referenceNumber',label:'Reference Number'},{key:'receiptNumber',label:'Receipt Number'}]},
 reports:{label:'Reports',endpoint:'reports'}, settings:{label:'Settings'}
};
tabs.materials.fields=tabs.products.fields;
const human=(s:string)=>s.replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase());
const show=(v:any)=>v==null||v===''?'-':typeof v==='boolean'?(v?'Active':'Inactive'):typeof v==='object'?JSON.stringify(v):(/^\d{4}-\d{2}-\d{2}T/.test(String(v))?new Date(v).toLocaleDateString('en-GB'):String(v));

const INVENTORY_TABS:Tab[]=['dashboard','categories','vendors','products','purchases','stock','orders','returns','payments','reports','settings'];
const STUDY_MATERIAL_TABS:Tab[]=['dashboard','books','materials','variants','bookKits','uniformKits'];
const EDITABLE_TABS:Tab[]=['categories','vendors','products','materials','variants','books','bookKits','uniformKits'];

const InventoryManagement:React.FC<{selectedSchoolId:number|null; mode?:'inventory'|'studyMaterials'}>=({selectedSchoolId,mode='inventory'})=>{
 const [tab,setTab]=useState<Tab>('dashboard'),[rows,setRows]=useState<any[]>([]),[summary,setSummary]=useState<any>({});
 const [form,setForm]=useState<Record<string,string>>({}),[open,setOpen]=useState(false),[loading,setLoading]=useState(false);
 const [editingId,setEditingId]=useState<number|null>(null),[editingRow,setEditingRow]=useState<any|null>(null);
 const [message,setMessage]=useToastMessageState();
 const [lookups,setLookups]=useState<{products:any[];categories:any[];classes:any[];sections:any[];sessions:any[];subjects:any[];vendors:any[];students:any[];orders:any[]}>({products:[],categories:[],classes:[],sections:[],sessions:[],subjects:[],vendors:[],students:[],orders:[]});
 const cfg=tabs[tab];
 const headers=()=>({accept:'application/json',Authorization:`Bearer ${localStorage.getItem('token')}`,'Content-Type':'application/json'});
 const visibleTabs=mode==='studyMaterials'?STUDY_MATERIAL_TABS:INVENTORY_TABS;
 useEffect(()=>{setTab('dashboard');closeForm();setMessage('');},[mode]); // eslint-disable-line
 useEffect(()=>{if(selectedSchoolId)loadLookups();},[selectedSchoolId]); // eslint-disable-line
 useEffect(()=>{if(selectedSchoolId)load();},[selectedSchoolId,tab]); // eslint-disable-line
 const load=async()=>{if(!selectedSchoolId)return;const endpoint=tab==='dashboard'?'dashboard':cfg.endpoint;if(!endpoint){setRows([]);return;}try{setLoading(true);setMessage('');const r=await fetch(`${API_BASE_URL}/api/Inventory/${endpoint}?schoolId=${selectedSchoolId}`,{cache:'no-store',headers:headers()});const ct=r.headers.get('content-type')||'';if(!ct.includes('application/json'))throw new Error(`Inventory API returned a non-JSON response (${r.status}).`);const j=await r.json();if(!r.ok)throw new Error(j.message||'Unable to load inventory.');if(tab==='dashboard'||tab==='reports')setSummary(j.data||{});else {const data=j.data||[];setRows(tab==='bookKits'?data.filter((x:any)=>x.kitType==='Book'):tab==='uniformKits'?data.filter((x:any)=>x.kitType==='Uniform'):data);}}catch(e){setMessage(e instanceof Error?e.message:'Unable to load inventory.');}finally{setLoading(false);}};
 const loadLookups=async()=>{if(!selectedSchoolId)return;try{const [productRes,categoryRes,enrollmentRes,subjectRes,vendorRes,studentRes,orderRes]=await Promise.all([
   fetch(`${API_BASE_URL}/api/Inventory/products?schoolId=${selectedSchoolId}`,{headers:headers()}),
   fetch(`${API_BASE_URL}/api/Inventory/categories?schoolId=${selectedSchoolId}`,{headers:headers()}),
   fetch(`${API_BASE_URL}/api/Student/enrollment-info?schoolId=${selectedSchoolId}`,{headers:headers()}),
   fetch(`${API_BASE_URL}/api/Subject/subjects-by-school?schoolId=${selectedSchoolId}&page=1&pageSize=1000`,{headers:headers()}),
   fetch(`${API_BASE_URL}/api/Inventory/vendors?schoolId=${selectedSchoolId}`,{headers:headers()}),
   fetch(`${API_BASE_URL}/api/Student/students-by-school?schoolId=${selectedSchoolId}&page=1&pageSize=1000`,{headers:headers()}),
   fetch(`${API_BASE_URL}/api/Inventory/orders?schoolId=${selectedSchoolId}`,{headers:headers()})]);
  const [products,categories,enrollment,subjects,vendors,students,orders]=await Promise.all([productRes.json(),categoryRes.json(),enrollmentRes.json(),subjectRes.json(),vendorRes.json(),studentRes.json(),orderRes.json()]);
  setLookups({products:products.data||[],categories:categories.data||[],classes:enrollment.data?.classes||[],sections:enrollment.data?.sections||[],sessions:enrollment.data?.sessions||[],subjects:subjects.data||[],vendors:vendors.data||[],students:students.data||[],orders:orders.data||[]});
 }catch(e){console.error('Failed to load inventory form options',e);}};
 const fieldOptions=(key:string):{value:string;label:string}[]=>{
  if(key==='productId')return lookups.products.map(x=>({value:String(x.id),label:`${x.productName} (${x.productCode})`}));
  if(key==='categoryId')return lookups.categories.map(x=>({value:String(x.id),label:x.name}));
  if(key==='academicSessionId')return lookups.sessions.map(x=>({value:String(x.id),label:`${String(x.yearStart).slice(0,4)}-${String(x.yearEnd).slice(0,4)}`}));
  if(key==='classId')return lookups.classes.map(x=>({value:String(x.id),label:x.name}));
  if(key==='sectionId')return lookups.sections.filter(x=>!form.classId||x.classId===Number(form.classId)).map(x=>({value:String(x.id),label:x.name}));
  if(key==='subjectId')return lookups.subjects.map(x=>({value:String(x.id),label:x.subjectName}));
  const optionKey=cfg.fields?.find(x=>x.key===key)?.optionsKey;
  if(optionKey==='vendors')return lookups.vendors.filter(x=>x.isActive!==false).map(x=>({value:String(x.id),label:x.vendorName}));
  if(optionKey==='students')return lookups.students.filter(x=>x.isActive!==false&&(!form.classId||Number(x.classId)===Number(form.classId))&&(!form.sectionId||Number(x.sectionId)===Number(form.sectionId))).map(x=>({value:String(x.id),label:`${x.studentName}${x.rollNumber?` - ${x.rollNumber}`:''}`}));
  if(optionKey==='orderTypes')return ['For Sale','For Use'].map(x=>({value:x,label:x}));
  if(optionKey==='issuedOrders')return lookups.orders.filter(x=>x.status==='Issued').map(x=>({value:String(x.id),label:`${x.orderNumber} - ${x.studentName}`}));
  if(optionKey==='outstandingOrders')return lookups.orders.filter(x=>Number(x.balance)>0).map(x=>({value:String(x.id),label:`${x.orderNumber} - ${x.studentName} - Due Rs. ${Number(x.balance).toLocaleString()}`}));
  if(optionKey==='stockTypes')return [{value:'IN',label:'Stock In'},{value:'OUT',label:'Stock Out'}];
  if(optionKey==='conditions')return ['Good','Damaged','Defective'].map(x=>({value:x,label:x}));
  if(optionKey==='yesNo')return [{value:'true',label:'Yes'},{value:'false',label:'No'}];
  if(optionKey==='paymentModes')return ['Cash','Card','UPI','Bank Transfer','Cheque'].map(x=>({value:x,label:x}));
  return [];
 };
 const save=async(e:React.FormEvent)=>{e.preventDefault();if(!selectedSchoolId||!cfg.fields||!cfg.endpoint)return;let body:any={...(editingRow||{}),schoolId:selectedSchoolId,isActive:editingRow?.isActive??true};const numericKeys=['categoryId','productId','academicSessionId','classId','sectionId','subjectId','vendorId','studentId','studentOrderId'];cfg.fields.forEach(f=>body[f.key]=f.type==='number'||numericKeys.includes(f.key)?Number(form[f.key]||0):(form[f.key]||null));if(tab==='bookKits')body.kitType='Book';if(tab==='uniformKits')body.kitType='Uniform';if(tab==='purchases')body={schoolId:selectedSchoolId,vendorId:Number(form.vendorId),purchaseDate:form.purchaseDate,invoiceNumber:form.invoiceNumber||null,items:[{productId:Number(form.productId),quantity:Number(form.quantity),rate:Number(form.rate),gstPercent:Number(form.gstPercent||0),discount:Number(form.discount||0)}]};if(tab==='orders')body={schoolId:selectedSchoolId,academicSessionId:Number(form.academicSessionId),studentId:Number(form.studentId),orderType:form.orderType,borrowDateTime:form.orderType==='For Use'?form.borrowDateTime:null,returnDateTime:form.orderType==='For Use'?form.returnDateTime:null,items:[{productId:Number(form.productId),quantity:Number(form.quantity),unitPrice:form.orderType==='For Sale'&&form.unitPrice?Number(form.unitPrice):null,discount:form.orderType==='For Sale'?Number(form.discount||0):0}]};if(tab==='returns')body={schoolId:selectedSchoolId,studentOrderId:Number(form.studentOrderId),reason:form.reason,items:[{productId:Number(form.productId),quantity:Number(form.quantity),condition:form.condition,restock:form.restock==='true'}]};try{const endpoint=cfg.postEndpoint||cfg.endpoint;const url=editingId===null?`${API_BASE_URL}/api/Inventory/${endpoint}`:`${API_BASE_URL}/api/Inventory/${endpoint}/${editingId}`;const r=await fetch(url,{method:editingId===null?'POST':'PUT',headers:headers(),body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw new Error(j.message||'Unable to save.');setMessage(j.message);closeForm();await Promise.all([load(),loadLookups()]);}catch(e){setMessage(e instanceof Error?e.message:'Unable to save.');}};
 const closeForm=()=>{setOpen(false);setEditingId(null);setEditingRow(null);setForm({});};
 const startEdit=(row:any)=>{if(!EDITABLE_TABS.includes(tab)||!cfg.fields)return;const values:Record<string,string>={};cfg.fields.forEach(f=>{const value=row[f.key];values[f.key]=value==null?'':f.type==='date'?String(value).slice(0,10):f.type==='datetime-local'?String(value).slice(0,16):String(value);});setForm(values);setEditingId(Number(row.id));setEditingRow(row);setOpen(true);};
 const editStockProduct=(row:any)=>{const values:Record<string,string>={};(tabs.products.fields||[]).forEach(f=>{const value=f.key==='unit'?row.quantity:row[f.key];values[f.key]=value==null?'':String(value);});setTab('products');setForm(values);setEditingId(Number(row.id));setEditingRow({...row,unit:row.quantity});setOpen(true);};
 const cols=useMemo(()=>rows.length?(tab==='stock'?['productName','productCode','purchasedQuantity','remainingQuantity','stockStatus','quantity']:Object.keys(rows[0]).filter(x=>!['id','schoolId'].includes(x)).slice(0,9)):[],[rows,tab]);
 if(!selectedSchoolId)return <div className="staff-list-loading">Please select a school</div>;
 const cards=[['Total Products',summary.totalProducts],['Books',summary.totalBooks],['Uniforms',summary.totalUniforms],['Study Materials',summary.totalStudyMaterials],['Low Stock',summary.lowStockItems],['Today Sales',`Rs. ${Number(summary.todaySales||0).toLocaleString()}`],['Pending Payments',`Rs. ${Number(summary.pendingPayments||0).toLocaleString()}`],['Monthly Revenue',`Rs. ${Number(summary.monthlyRevenue||0).toLocaleString()}`]];
 return <div className="staff-list-container"><div className="staff-list-header"><h2>{mode==='studyMaterials'?'Study Materials':'School Store / Inventory'}</h2></div>
  <div className="management-tabs inventory-tabs" role="tablist">{visibleTabs.map(k=><button key={k} role="tab" type="button" aria-selected={tab===k} className={`management-tab ${tab===k?'active':''}`} onClick={()=>{setTab(k);closeForm();setMessage('');}}>{tabs[k].label}</button>)}</div>
  {message&&<div style={{padding:'10px 14px',marginBottom:'14px',borderRadius:'8px',background:'#edf2f7'}}>{message}</div>}
  {tab==='dashboard'?<div className="stats-grid">{cards.map(([l,v])=><div className="stat-card" key={String(l)}><div className="stat-header"><span>{l}</span></div><div className="stat-value">{v??0}</div></div>)}</div>
  :tab==='settings'?<div className="staff-list-loading">Configure barcode prefixes, invoice numbering, tax defaults, roles and low-stock notification thresholds here.</div>
  :tab==='reports'?<div className="stats-grid">{[['Inventory Value',summary.inventoryValue],['Sales Value',summary.salesValue],['Collected',summary.collected],['Low Stock',summary.lowStock]].map(([l,v])=><div className="stat-card" key={String(l)}><div className="stat-header"><span>{l}</span></div><div className="stat-value">{l==='Low Stock'?v:`Rs. ${Number(v||0).toLocaleString()}`}</div></div>)}</div>
  :<>{cfg.fields&&<div style={{display:'flex',justifyContent:'flex-end',marginBottom:'16px'}}><button className="btn btn-primary" onClick={()=>open?closeForm():setOpen(true)}>{open?'Close':`+ Add ${cfg.label}`}</button></div>}
   {loading?<div className="staff-list-loading">Loading...</div>:rows.length===0?<div className="staff-list-loading">No records found.</div>:<div className="staff-table-wrapper"><table className="staff-table"><thead><tr>{cols.map(c=><th key={c}>{human(c)}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.id??i}>{cols.map((c,columnIndex)=><td key={c}>{(EDITABLE_TABS.includes(tab)&&columnIndex===0)||(tab==='stock'&&c==='productName')?<span className="staff-name-link" onClick={()=>tab==='stock'?editStockProduct(r):startEdit(r)}>{show(r[c])}</span>:show(r[c])}</td>)}</tr>)}</tbody></table></div>}</>}
  <Modal isOpen={open} onClose={closeForm} title={`${editingId===null?'Add':'Edit'} ${cfg.label.replace(/s$/,'')}`} submitLabel={editingId===null?'Save':'Update'} formId="inventory-form" showCancel={false} size="large">
   {cfg.fields&&<form id="inventory-form" onSubmit={save} className="form-grid">{cfg.fields.filter(f=>tab!=='orders'||form.orderType==='For Use'||!['borrowDateTime','returnDateTime'].includes(f.key)).filter(f=>tab!=='orders'||form.orderType!=='For Use'||!['unitPrice','discount'].includes(f.key)).map(f=>{const options=fieldOptions(f.key);const temporaryRequired=tab==='orders'&&form.orderType==='For Use'&&['borrowDateTime','returnDateTime'].includes(f.key);return <div className="form-group" key={f.key}><label title={f.help}>{f.label.replace(' ID','')}{f.help?' ℹ️':''}{f.required||temporaryRequired?' *':''}</label>{f.type==='select'||options.length>0||['productId','categoryId','academicSessionId','classId','sectionId','subjectId'].includes(f.key)?<select required={f.required||temporaryRequired} value={form[f.key]||''} disabled={(f.key==='sectionId'&&!form.classId)||(f.key==='studentId'&&(!form.classId||!form.sectionId))} onChange={e=>setForm({...form,[f.key]:e.target.value,...(f.key==='classId'?{sectionId:'',studentId:''}:f.key==='sectionId'?{studentId:''}:{})})}><option value="">Select {f.label.replace(' ID','')}</option>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:<input type={f.type||'text'} step={f.type==='number'?'any':undefined} required={f.required||temporaryRequired} value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})}/>}</div>})}</form>}
  </Modal>
 </div>;
};
export default InventoryManagement;

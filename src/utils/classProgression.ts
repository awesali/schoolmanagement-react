// Class IDs and API ordering do not indicate academic progression.
export const classLevel=(name:string=''):number|undefined=>{
 const label=name.trim().toLowerCase().replace(/^(class|grade|std\.?|standard)\s*[-:]?\s*/, '').trim();
 const earlyYears:Record<string,number>={'nursery':-2,'pre nursery':-3,'pre-nursery':-3,'lkg':-1,'lower kg':-1,'lower kindergarten':-1,'ukg':0,'upper kg':0,'upper kindergarten':0,'kg':0,'kindergarten':0};
 if(Object.prototype.hasOwnProperty.call(earlyYears,label))return earlyYears[label];
 const number=label.match(/^(\d+)\s*(?:st|nd|rd|th)?$/);
 if(number)return Number(number[1]);
 const roman=['i','ii','iii','iv','v','vi','vii','viii','ix','x','xi','xii'];
 const index=roman.indexOf(label);
 return index>=0?index+1:undefined;
};

export const isNextClass = (source: string, destination: string): boolean => {
 const level = classLevel(source);
 return level !== undefined && classLevel(destination) === level + 1;
};

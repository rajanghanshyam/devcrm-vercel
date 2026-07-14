import{r as x,g as R,a as d}from"./react-CCXFnprz.js";function v(s,n){for(var o=0;o<n.length;o++){const t=n[o];if(typeof t!="string"&&!Array.isArray(t)){for(const r in t)if(r!=="default"&&!(r in s)){const e=Object.getOwnPropertyDescriptor(t,r);e&&Object.defineProperty(s,r,e.get?e:{enumerable:!0,get:()=>t[r]})}}}return Object.freeze(Object.defineProperty(s,Symbol.toStringTag,{value:"Module"}))}var c={exports:{}},a={};/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var p;function m(){if(p)return a;p=1;var s=Symbol.for("react.transitional.element"),n=Symbol.for("react.fragment");function o(t,r,e){var u=null;if(e!==void 0&&(u=""+e),r.key!==void 0&&(u=""+r.key),"key"in r){e={};for(var i in r)i!=="key"&&(e[i]=r[i])}else e=r;return r=e.ref,{$$typeof:s,type:t,key:u,ref:r!==void 0?r:null,props:e}}return a.Fragment=n,a.jsx=o,a.jsxs=o,a}var f;function E(){return f||(f=1,c.exports=m()),c.exports}var k=E(),l=x();const _=R(l),T=v({__proto__:null,default:_},[l]);var q=d();export{T as R,q as a,_ as b,k as j,l as r};

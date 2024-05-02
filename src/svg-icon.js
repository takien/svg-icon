/**
 * --------------------------------------------------------------------------
 * svg-icon.js
 * Licensed under MIT (https://github.com/takien/svg-icon/blob/main/LICENSE)
 * --------------------------------------------------------------------------
 */

import iconList from './icons.js';
const svgIcon = (el) => {

   	const iObserver = new IntersectionObserver((entries, observer) => {
		entries.forEach((e) => {		
			if( e.isIntersecting  ) {
				if( !e.target.classList.contains('is-revealed') ) {
					e.target.dispatchEvent(new Event('elementRevealed'));
				}
				e.target.dispatchEvent(new Event('elementVisible'));

				e.target.classList.add('is-visible','is-revealed');
			}
			
	   });
	 }, {
	   root: null,
	   rootMargin: "0px",
	   threshold: [0, 0.25, 0.5, 0.75, 1],
	 }),
	 iconFromAlias = (alias) => {
		let _ret  = null;
		for (const icons of Object.entries(iconList)) {
			const [key,icon] = icons;
			if( icon.alias && icon.alias ){
				if( Array.isArray(icon.alias) && icon.alias.includes(alias) ){
					_ret = key;
				}
				else if ( icon.alias == alias ) {
					_ret = key;
				}
			}
		};
		return _ret;
	},
	iconUrl = (attrs) => {
		let {vendor,icon,type,category} = attrs;
		if (!vendor.includes('/')) {
			vendor = iconFromAlias(vendor);
		}
		const [user,repo] = vendor.split('/'),
		icons = iconList[vendor],
		version 	= icons.version ? '@'+icons.version : '',
		source 	= icons.source ?? 'gh',
		base 		= ('npm' == source ) ? `${repo}` : `${vendor}`;

	 
		let path = icons.pathCdn ?? icons.path;
  
 		path = !path.includes('${name}') ? path+'/${name}' : path;
		path = path		.replace('${type}', type ?? '')
						.replace('${name}', icon )
						.replace('${category}', category ?? '');
	
		 
 		return `https://cdn.jsdelivr.net/${source}/${base}${version}/${path}.min.svg`;
	},
	iconData = ( el ) => {
		const attrs   = {...el.dataset},
		svgattr = ['class','width','height','color','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin'],
		extractSvgAttr = (obj, keysArray) => {
			return Object.fromEntries(
			  Object.entries(obj).filter(([key]) => keysArray.includes(key))
			);
		}
			Array.from(el.attributes).forEach(attr => {
				if( attr.name.includes('data-')) {
					return;
				}
				attrs[attr.name] = attr.value;
			});

		const svg_attrs = extractSvgAttr( attrs, svgattr );
		return {attrs, svg_attrs};
	},
	_fetch = async ( attrs ) => {
 		const res = await fetch(iconUrl( attrs ), {
			  headers: {'Accept': 'text/xml'
			  }
		  });
	  	return await res.text();
	},
	renderIcon = (icon) => {
 		const {attrs,svg_attrs} = iconData( icon );
		if( !attrs.icon ) return;

		const parser    = new DOMParser();
		
		_fetch( attrs )
		.then( data => {
			if( !data.match(/<svg/gi)) {
				icon.dispatchEvent(new CustomEvent("svgIconFailed", { 
					bubbles: true,
					detail: {
						placeholder:icon,
						attr: attrs,
						data: data
					} }));
				return false;
			};
 			const svg = parser.parseFromString(data, "image/svg+xml").firstElementChild;
 			if( svg.nodeName == 'parsererror') {
				icon.dispatchEvent(new CustomEvent("svgIconParseFailed", { 
					bubbles:true,
					detail: {
						placeholder:icon,
						svg: svg,
						attr: attrs
					} }));
				icon.innerHTML = '<span style="color:red">ERROR!</span>';
			}
			else {
				Object.entries(svg_attrs).forEach( entry => {
					const [key, value] = entry;
					if( 'class' == key ){
  						if( svg_attrs[key].length > 0 ){
							svg.classList.add(...svg_attrs[key].trim().split(' '));
						}
					}
					else {
						svg.setAttribute(key,value);
					}
				});

				if( !svg.hasAttribute('viewBox')){
					svg.setAttribute('viewBox', '0 0 '+(svg.getAttribute('width') ?? '24')+' '+(svg.getAttribute('height') ?? '24'));
				}
				if( attrs.config ){
					const conf = JSON.parse( attrs.config.replace(/'/g,'"'));
					Object.entries(conf).forEach(entry => {
						const [selector,attributes] = entry;
						Object.entries(attributes).forEach( entry  => {
							const [key,val] = entry,
							sel = selector.replace(/([^ ]+) (\d+)/g,':nth-child($2 of $1)');

							if( svg.querySelector(sel) ) {
								svg.querySelector(sel).setAttribute(key,val);
							}
						});
					});
				}
				icon.dispatchEvent(new CustomEvent("svgIconRendered", { 
					bubbles:true,
					detail: {
						placeholder:icon,
						svg: svg,
						attr: attrs
				} }));
				icon.classList.add('svg-icon-rendered');
 				icon.replaceWith(svg);
			}
 
		})
	},
	Placeholder = document.querySelectorAll(el+':not(.svg-icon-rendered)');

	Placeholder.forEach( icon => {
	iObserver.observe( icon );
		icon.addEventListener('elementRevealed',()=>{
			renderIcon( icon );
		});
	});
}

addEventListener("DOMContentLoaded", () => {
	svgIcon( 'svg-icon' );
});
document.addEventListener("renderSVGIcon", () => {
	svgIcon( 'svg-icon' );
});
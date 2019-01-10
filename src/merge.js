module.exports = function mergeOptions(...optionsList) {
	const finalOptions = DefaultOptionsFactory();

	optionsList.forEach(({
		cas = finalOptions.cas,
		casServerUrlPrefix = finalOptions.casServerUrlPrefix,
		serverName = finalOptions.serverName,
		client,
		server
	}) => {
		finalOptions.cas = cas;
		finalOptions.casServerUrlPrefix = casServerUrlPrefix;
		finalOptions.serverName = serverName;

		if (client) {
			const {
				service = finalOptions.client.service,
				slo = finalOptions.client.slo,
				renew = finalOptions.client.renew,
				gateway = finalOptions.client.gateway,
				useSession =  finalOptions.client.useSession,
				method = finalOptions.client.method,
				ignore = finalOptions.client.ignore,
				proxy
			} = client;

			finalOptions.client.service = service;
			finalOptions.client.slo = slo;
			finalOptions.client.renew = renew;
			finalOptions.client.gateway = gateway;
			finalOptions.client.useSession = useSession;
			finalOptions.client.method = method;
			finalOptions.client.ignore = ignore;

			if (proxy) {
				const {
					acceptAny = finalOptions.client.proxy.acceptAny,
					allowedChains = finalOptions.client.proxy.allowedChains,
					callbackUrl = finalOptions.client.proxy.callbackUrl,
					receptorUrl = finalOptions.client.proxy.receptorUrl,
				} = proxy;

				finalOptions.client.proxy.acceptAny = acceptAny;
				finalOptions.client.proxy.allowedChains = allowedChains;
				finalOptions.client.proxy.callbackUrl = callbackUrl;
				finalOptions.client.proxy.receptorUrl = receptorUrl;
			}
		}

		if (server) {
			const {
				loginUrl = finalOptions.server.loginUrl,
				path
			} = server;

			finalOptions.proxy.loginUrl = loginUrl;

			if (path) {
				const {
					login = finalOptions.server.path.login,
					logout = finalOptions.server.path.logout,
					validate = finalOptions.server.path.validate,
					serviceValidate = finalOptions.server.path.serviceValidate,
					proxyValidate = finalOptions.server.path.proxyValidate,
					proxy = finalOptions.server.path.proxy,
					p3
				} = path;

				finalOptions.server.path.login = login;
				finalOptions.server.path.logout = logout;
				finalOptions.server.path.validate = validate;
				finalOptions.server.path.serviceValidate = serviceValidate;
				finalOptions.server.path.proxyValidate = proxyValidate;
				finalOptions.server.path.proxy = proxy;

				if (p3) {
					const {
						serviceValidate = finalOptions.server.path.p3.serviceValidate,
						proxyValidate = finalOptions.server.path.p3.proxyValidate
					} = p3;

					finalOptions.server.path.p3.serviceValidate = serviceValidate;
					finalOptions.server.path.p3.proxyValidate = proxyValidate;
				}
			}
		}
	});

	validateOptions(finalOptions);

	const { renew, gateway } = finalOptions.client;

	if (renew && gateway) {
		throw new Error('In options gateway & renew can not be true at same time.');
	}

	if (finalOptions.client.proxy.callbackUrl) {
		if (!finalOptions.client.proxy.receptorUrl) {
			throw new Error('Use proxy and callbackUrl set. receptorUrl can not be null.');
		}
	}

	return finalOptions;
};

class CasMiddlewareOptionsError extends Error {}

const validateOptionsRule = {
	cas(value) {
		return [1, 2, 3].indexOf(value) !== -1;
	},
	casServerUrlPrefix: isString,
	serverName: isString,
	client: {
		renew: isBoolean,
		gateway: isBoolean,
		slo: isBoolean,
		ignore(value) {
			if (Array.isArray(value)) {
				return !value.find(value => !(value instanceof RegExp));
			}

			return value instanceof RegExp || typeof value === 'function';
		},
		proxy: {
			acceptAny: isBoolean,
			allowedChains(value) {
				if (Array.isArray(value)) {
					return !value.find(value => !isString(value) || !(value instanceof RegExp));
				}
	
				return value instanceof RegExp || typeof value === 'function';
			},
			callbackUrl(value) {
				return isString(value) || value === null;
			},
			receptorUrl(value) {
				return isString(value) || value === null;
			}
		}
	},
	server: {
		loginUrl(value) {
			return isString(value) || value === null;
		},
		path: {
			login: isString,
			logout: isString,
			validate: isString,
			serviceValidate: isString,
			proxyValidate: isString,
			proxy: isString,
			p3: {
				serviceValidate: isString,
				proxyValidate: isString
			}
		}
	}
};

function validateOptions(options) {
	const nodePath = [];

	function validate(ruleNode, optionsNode) {
		Object.keys(ruleNode).forEach(item => {
			nodePath.push(item);

			const ruleValidator = ruleNode[item];
			const optionsValue = optionsNode[item];

			if (typeof ruleValidator === 'object') {

				validate(ruleValidator, optionsValue);
			} else if (!ruleValidator(optionsValue)) {
				throw new CasMiddlewareOptionsError(`Bad value at options.${nodePath.join('.')}`);
			}

			nodePath.pop();
		});
	}

	validate(validateOptionsRule, options);

	return true;
}

function DefaultOptionsFactory() {
	return {
		cas: 3,
		// casServerUrlPrefix
		// serverName
		client: {
			service: null,
			slo: true,
			renew: false,
			gateway: false,
			useSession: false,
			method: 'GET',
			ignore: [/\.(ico|css|js|jpe?g|svg|png)/],
			proxy: {
				acceptAny: false,
				allowedChains: () => true,
				callbackUrl: null,
				receptorUrl: null
			}
		},
		server: {
			loginUrl: null,
			path: {
				login: '/login',
				logout: '/logout',
				validate: '/validate',
				serviceValidate: '/serviceValidate',
				proxyValidate: '/proxyValidate',
				proxy: '/proxy',
				p3: {
					serviceValidate: '/p3/serviceValidate',
					proxyValidate: '/p3/proxyValidate',
				}
			}
		}
	};
}

function isBoolean(value) {
	return typeof value === 'boolean';
}

function isString(value) {
	return typeof value === 'string';
}
/* eslint-env node */

define("server/RedisDB", ["redis", "dirty", "events", "icebox"], (redis, Dirty, Events, Icebox) => {

	const client = redis.createClient(process.env.REDIS_URL);
	const { promisify } = require("util");
	const getAsync = promisify(client.get).bind(client);
	const keysAsync = promisify(client.keys).bind(client);

	/**
	 * Inplementation of abstract DB interface using a Redis database
	 */
	class DB extends Events.EventEmitter {
		constructor() {
			super()
			this.prototypeMap = {};
			Events.EventEmitter.call(this);
			console.log('opening redis database');
			var db = this;
			db.on('all', function () { db.emit('load', 0); });
		}

		registerObject(constructor) {
			this.prototypeMap[constructor.name] = constructor;
		}

		async get(key) {
			const json = await getAsync(key);
			const data = JSON.parse(json);
			const game = Icebox.thaw(data, this.prototypeMap);
			return game;
		}

		set(key, object) {
			const data = Icebox.freeze(object);
			client.set(key, JSON.stringify(data));
		}

		async all() {
			const keys = await keysAsync('*');
			var retval = [];
			for (let i = 0; i < keys.length; i++) {
				const jsn = await getAsync(keys[i]);
				const value = JSON.parse(jsn);
				retval.push(value);
			}
			return retval;
		}

		snapshot() {
			console.log("Called redis stub snapshot function")
		}
	}

	return DB;
});

/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */
import WebAudioModule from '../../../lib/sdk/src/WebAudioModule.js';
import ParamMgrFactory from '../../../lib/sdk-parammgr/src/ParamMgrFactory.js';
import CompositeAudioNode from '../../../lib/sdk-parammgr/src/CompositeAudioNode.js';
import KeyboardUI from './KeyboardUI.js';

/**
 * @param {URL} relativeURL
 * @returns {string}
 */
const getBasetUrl = (relativeURL) => {
	const baseURL = relativeURL.href.substring(0, relativeURL.href.lastIndexOf('/'));
	return baseURL;
};

class Node extends CompositeAudioNode {
	/**
	 * @param {import('../sdk-parammgr').ParamMgrNode} paramMgr
	 */
	setup(paramMgr) {
		this._wamNode = paramMgr;
		this._output = paramMgr;
	}
}

export default class KeyboardPlugin extends WebAudioModule {
	_baseURL = getBasetUrl(new URL('.', import.meta.url));

	_descriptorUrl = `${this._baseURL}/descriptor.json`;

	async _loadDescriptor() {
		const url = this._descriptorUrl;
		if (!url) throw new TypeError('Descriptor not found');
		const response = await fetch(url);
		const descriptor = await response.json();
		Object.assign(this.descriptor, descriptor);
	}

	async initialize(state) {
		await this._loadDescriptor();
		return super.initialize(state);
	}

	async createAudioNode(initialState) {
		const paramMgrNode = await ParamMgrFactory.create(this, {});
		const node = new Node(this.audioContext);
		node.setup(paramMgrNode);

		// If there is an initial state at construction for this plugin,
		if (initialState) node.setState(initialState);

		node.connect(this.audioContext.destination);

		return node;
	}

	async createGui() {
		const keyboard = new KeyboardUI();
		// define midi event emitter
		keyboard.onMidi = (bytes) => this.audioNode?._wamNode.emitEvents({ type: 'wam-midi', time: this.audioContext.currentTime, data: { bytes } });
		
		// also listen to midi input for highlighting keys
		this.audioNode?._wamNode.addEventListener('wam-midi', (e) => {
			console.log("KEYBOARD A RECU" + e);
			// MB : Quentin teste ici combien il faut enlever pour que si tu joues
			// C4 sur le clavier midi ça joue la bonne note sur le clavier virtuel
			const key = e.detail.data.bytes[0] - 50;
			const velocity = e.detail.data.bytes[1];
			keyboard.onKeyTriggered(key, velocity, undefined)
		});
		return keyboard;
	}
}

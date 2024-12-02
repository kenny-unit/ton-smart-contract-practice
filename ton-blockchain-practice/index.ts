import { getHttpEndpoint, Network } from "@orbs-network/ton-access";
import { KeyPair, mnemonicToWalletKey } from "@ton/crypto";
import {
  Address,
  fromNano,
  internal,
  OpenedContract,
  TonClient,
  WalletContractV4,
} from "@ton/ton";
import "dotenv/config";
import { sleep } from "./helper.js";

class Wallet {
  private readonly workchain: number;

  // Constants
  private MNEMONIC: string[]; // Recover phrase from .env
  private readonly MNEMONIC_LENGTH: number;
  private NETWORK: Network;

  private readonly KEY_PAIR_ERROR_MESSAGE: string;
  private readonly WALLET_CONTRACT_ERROR_MESSAGE: string;
  private readonly ENDPOINT_ERROR_MESSAGE: string;
  private readonly TON_CLIENT_ERROR_MESSAGE: string;
  private readonly ADDRESS_ERROR_MESSAGE: string;

  private keyPair?: KeyPair; // TON Wallet key pair which consists of public key and secret key
  private contract?: WalletContractV4; // The TON Wallet contract
  private endpoint?: string; // TON RPC Endpoint
  private tonClient?: TonClient; // TON Client to call RPC
  private address?: Address; // Wallet Address

  constructor() {
    this.KEY_PAIR_ERROR_MESSAGE =
      "Key pair is not set, try calling setKeyPair()";
    this.WALLET_CONTRACT_ERROR_MESSAGE =
      "Wallet contract is not set, try calling setWalletV4Contract()";
    this.ENDPOINT_ERROR_MESSAGE =
      "Endpoint is not set, try calling setEndpoint()";
    this.TON_CLIENT_ERROR_MESSAGE =
      "TON Client is not set, try calling setTonClient()";
    this.ADDRESS_ERROR_MESSAGE = "Address is not set, try calling setAddress()";

    this.NETWORK =
      process.env.NETWORK === "testnet" || process.env.NETWORK === "mainnet"
        ? process.env.NETWORK
        : "testnet"; // Set network to NETWORK in .env if not parse it as testnet
    this.MNEMONIC_LENGTH = parseInt(process.env.MNEMONIC_LENGTH || "24"); // Wallet recovery phrase length to be MNEMONIC_LENGTH in .env or hardcode it to 24
    this.MNEMONIC = this.getMnemonic(); // Set wallet mnemonic

    this.workchain = 0; // Labels the chain that aren't used by validators [0 (non-validator), 1 (validator)]
  }

  /**
   * Sets the network.
   *
   * This method sets the network for the wallet from the .env file.
   *
   * @throws {Error} If 'NETWORK' is not visible in the .env.
   *
   * @returns {void}
   */
  setNetwork(): void {
    // Check if 'NETWORK' variable is visible in the .env file
    if (!process.env.NETWORK) {
      throw new Error("'NETWORK' is not visible in the .env");
    }

    if (
      !(process.env.NETWORK === "testnet" || process.env.NETWORK === "mainnet")
    ) {
      throw new Error(
        "'NETWORK' in .env should only be 'testnet' or 'mainnet'"
      );
    }

    this.NETWORK = process.env.NETWORK;

    return;
  }

  /**
   * Retrieves the network setting.
   *
   * This method returns the cached network setting if it exists. If the network
   * is not already set, it attempts to set it by calling the setNetwork method.
   *
   * @throws {Error} If setting the network fails.
   *
   * @returns {string} The network setting, either 'testnet' or 'mainnet'.
   */
  getNetwork(): string {
    try {
      if (!this.NETWORK) this.setNetwork(); // Set NETWORK from .env if cache does not exist

      return this.NETWORK; // Return this.NETWORK
    } catch (e) {
      throw e;
    }
  }

  /**
   * Sets the wallet recovery phrase from the .env file.
   *
   * @throws {Error} If 'MNEMONIC' is not visible in the .env.
   * @throws {Error} If 'MNEMONIC' in .env is invalid.
   *
   * @returns {void}
   */
  setMnemonic(): void {
    // Check if 'MNEMONIC' variable is not visible in the .env file
    if (!process.env.MNEMONIC) {
      throw new Error("'MNEMONIC' is not visible in the .env");
    }

    this.MNEMONIC = process.env.MNEMONIC.split(" "); // Split MNEMONIC in .env into a string array with a space

    // Check if MNEMONIC conforms to MNEMONIC_LENGTH and throw if MNEMONIC does not conform
    if (this.MNEMONIC.length !== this.MNEMONIC_LENGTH) {
      throw new Error(
        "'MNEMONIC' in .env is invalid, make sure to input 24 words."
      );
    }

    return;
  }

  /**
   * Retrieves the wallet recovery phrase.
   *
   * This method returns the cached wallet recovery phrase (mnemonic) if it
   * exists. If the mnemonic is not already set, it attempts to set it by
   * calling the setMnemonic method.
   *
   * @throws {Error} If setting the mnemonic fails.
   *
   * @returns {string[]} The wallet recovery phrase as an array of strings.
   */
  getMnemonic(): string[] {
    try {
      if (!this.MNEMONIC) this.setMnemonic(); // Return cached mnemonic

      return this.MNEMONIC; // If no mnemonic is found, return new mnemonic
    } catch (e) {
      throw e;
    }
  }

  /**
   * Sets the wallet key pair.
   *
   * This method sets the wallet key pair from the wallet recovery phrase
   * (mnemonic). If the mnemonic is not already set, it attempts to set it by
   * calling the setMnemonic method.
   *
   * @throws {Error} If setting the key pair fails.
   *
   * @returns {Promise<void>} A promise that resolves when the key pair is set.
   */
  async setKeyPair(): Promise<void> {
    try {
      if (!this.MNEMONIC) this.getMnemonic(); // If no cached mnemonic is found, get the mnemonic from .env

      this.keyPair = await mnemonicToWalletKey(this.MNEMONIC); // If no key pair is found, return new key pair

      return;
    } catch (e) {
      throw e;
    }
  }

  /**
   * Retrieves the wallet key pair.
   *
   * This method returns the cached key pair if it exists. If the key pair is
   * not already set, it attempts to set it by calling the setKeyPair method.
   *
   * @throws {Error} If setting the key pair fails.
   *
   * @returns {Promise<KeyPair>} A promise that resolves with the wallet key pair.
   */
  async getKeyPair(): Promise<KeyPair> {
    try {
      if (!this.keyPair) await this.setKeyPair();

      if (!this.keyPair) throw new Error(this.KEY_PAIR_ERROR_MESSAGE);

      return this.keyPair;
    } catch (e) {
      throw e;
    }
  }

  /**
   * Sets the wallet contract.
   *
   * This method sets the wallet contract for the TonClient using the public key
   * from the key pair. If the key pair is not already set, it attempts to set it
   * by calling the setKeyPair method.
   *
   * @throws {Error} If setting the wallet contract fails.
   *
   * @returns {Promise<void>} A promise that resolves when the wallet contract is set.
   */
  async setWalletV4Contract(): Promise<void> {
    try {
      if (!this.keyPair) await this.setKeyPair();

      if (!this.keyPair) throw new Error(this.KEY_PAIR_ERROR_MESSAGE);

      this.contract = WalletContractV4.create({
        publicKey: this.keyPair.publicKey,
        workchain: this.workchain,
      }); // Set this wallet into the public key from the keypair in the main chain

      return;
    } catch (e) {
      throw e;
    }
  }

  /**
   * Retrieves the wallet contract.
   *
   * This method returns the cached wallet contract if it exists. If the wallet
   * contract is not already set, it attempts to set it by calling the
   * setWalletV4Contract method.
   *
   * @throws {Error} If the wallet hasn't been set yet. Try calling setWalletV4Contract() first.
   *
   * @returns {Promise<WalletContractV4>} A promise that resolves with the wallet contract.
   */
  async getWalletV4Contract(): Promise<WalletContractV4> {
    try {
      if (!this.contract) await this.setWalletV4Contract();

      if (!this.contract) throw new Error(this.WALLET_CONTRACT_ERROR_MESSAGE);

      return this.contract;
    } catch (e) {
      throw e;
    }
  }

  /**
   * Sets the wallet address.
   *
   * This method sets the wallet address using the wallet contract. If the wallet
   * contract is not already set, it attempts to set it by calling the
   * setWalletV4Contract method.
   *
   * @throws {Error} If the wallet contract hasn't been set yet. Try calling setWalletV4Contract() first.
   *
   * @returns {Promise<void>} A promise that resolves when the wallet address is set.
   */
  async setAddress(): Promise<void> {
    try {
      if (!this.contract) await this.setWalletV4Contract();

      if (!this.contract) throw new Error(this.WALLET_CONTRACT_ERROR_MESSAGE);

      this.address = this.contract.address;

      return;
    } catch (e) {
      throw e;
    }
  }

  /**
   * Retrieves the wallet address.
   *
   * This method returns the address of the wallet contract if it exists. If the
   * wallet contract is not already set, it attempts to set it by calling the
   * setWalletV4Contract method.
   *
   * @throws {Error} If the wallet hasn't been set yet. Try calling setWalletV4Contract() first.
   *
   * @returns {Promise<Address>} A promise that resolves with the wallet address.
   */
  async getAddress(): Promise<Address> {
    try {
      if (!this.address) await this.setAddress();

      if (!this.address) throw new Error(this.WALLET_CONTRACT_ERROR_MESSAGE);

      return this.address;
    } catch (e) {
      throw e;
    }
  }

  /**
   * Sets the HTTP endpoint for the wallet.
   *
   * This method sets the HTTP endpoint based on the current network setting.
   * If the network is not already set, it attempts to set it by calling the
   * getNetwork method.
   *
   * @throws {Error} If retrieving the endpoint fails.
   *
   * @returns {Promise<void>} A promise that resolves when the endpoint is set.
   */
  async setEndpoint(): Promise<void> {
    try {
      if (!this.NETWORK) this.getNetwork();

      this.endpoint = await getHttpEndpoint({ network: this.NETWORK });

      return;
    } catch (e) {
      throw e;
    }
  }

  /**
   * Retrieves the HTTP endpoint for the wallet.
   *
   * This method returns the cached endpoint if it exists. If the endpoint is not
   * already set, it attempts to set it by calling the setEndpoint method.
   *
   * @throws {Error} If retrieving the endpoint fails.
   *
   * @returns {Promise<string>} A promise that resolves with the HTTP endpoint.
   */
  async getEndpoint(): Promise<string> {
    try {
      if (!this.endpoint) await this.setEndpoint();

      if (!this.endpoint) throw new Error(this.ENDPOINT_ERROR_MESSAGE);

      return this.endpoint;
    } catch (e) {
      throw e;
    }
  }

  /**
   * Initializes the TonClient instance.
   *
   * This method sets the TonClient instance using the cached HTTP endpoint.
   * If the endpoint is not already set, it attempts to set it by calling the
   * setEndpoint method.
   *
   * @throws {Error} If the endpoint is not set. Try calling setEndpoint() first.
   *
   * @returns {Promise<void>} A promise that resolves when the TonClient is initialized.
   */
  async setTonClient(): Promise<void> {
    try {
      if (!this.endpoint) await this.setEndpoint();

      if (!this.endpoint) throw new Error(this.ENDPOINT_ERROR_MESSAGE);

      this.tonClient = new TonClient({ endpoint: this.endpoint });

      return;
    } catch (e) {
      throw e;
    }
  }

  /**
   * Retrieves the TonClient instance.
   *
   * This method returns the cached TonClient instance if it exists. If the
   * TonClient instance is not already set, it attempts to set it by calling the
   * setTonClient method.
   *
   * @throws {Error} If the TonClient instance is not set. Try calling setTonClient() first.
   *
   * @returns {Promise<TonClient>} A promise that resolves with the TonClient instance.
   */
  async getTonClient(): Promise<TonClient> {
    try {
      if (!this.tonClient) await this.setTonClient();

      if (!this.tonClient) throw new Error(this.TON_CLIENT_ERROR_MESSAGE);

      return this.tonClient;
    } catch (e) {
      throw e;
    }
  }

  /**
   * Retrieves the sequence number of the wallet contract.
   *
   * This method retrieves the sequence number of the wallet contract. If the
   * TonClient instance is not already set, it attempts to set it by calling the
   * setTonClient method. If the wallet contract is not already set, it attempts
   * to set it by calling the setWalletV4Contract method.
   *
   * @throws {Error} If the TonClient instance is not set. Try calling setTonClient() first.
   * @throws {Error} If the wallet contract is not set. Try calling setWalletV4Contract() first.
   *
   * @returns {Promise<number>} A promise that resolves with the sequence number.
   */
  async getSeqno(): Promise<number> {
    try {
      if (!this.tonClient) await this.setTonClient();

      if (!this.tonClient) throw new Error(this.TON_CLIENT_ERROR_MESSAGE);

      if (!this.contract) await this.setWalletV4Contract();

      if (!this.contract) throw new Error(this.WALLET_CONTRACT_ERROR_MESSAGE);

      const openedContract: OpenedContract<WalletContractV4> =
        this.tonClient.open(this.contract);

      return await openedContract.getSeqno();
    } catch (e) {
      throw e;
    }
  }

  /**
   * Retrieves the balance of the wallet.
   *
   * This method returns the balance of the wallet in Toncoin as a string.
   *
   * @throws {Error} If the TonClient instance is not set. Try calling setTonClient() first.
   * @throws {Error} If the wallet address is not set. Try calling setAddress() first.
   *
   * @returns {Promise<string>} A promise that resolves with the balance of the wallet in Toncoin as a string.
   */
  async getBalance(): Promise<string> {
    try {
      if (!this.tonClient) await this.setTonClient();

      if (!this.tonClient) throw new Error(this.TON_CLIENT_ERROR_MESSAGE);

      if (!this.address) await this.setAddress();

      if (!this.address) throw new Error(this.ADDRESS_ERROR_MESSAGE);

      return fromNano(await this.tonClient.getBalance(this.address));
    } catch (e) {
      throw e;
    }
  }

  /**
   * Checks if the wallet contract is deployed.
   *
   * This method checks if the wallet contract is deployed using the TonClient instance.
   *
   * @throws {Error} If the TonClient instance is not set. Try calling setTonClient() first.
   * @throws {Error} If the wallet address is not set. Try calling setAddress() first.
   *
   * @returns {Promise<boolean>} A promise that resolves with a boolean indicating whether the wallet contract is deployed or not.
   */
  async checkIfWalletIsDeployed(): Promise<boolean> {
    try {
      if (!this.tonClient) await this.setTonClient();

      if (!this.tonClient) throw new Error(this.TON_CLIENT_ERROR_MESSAGE);

      if (!this.address) await this.setAddress();

      if (!this.address) throw new Error(this.ADDRESS_ERROR_MESSAGE);

      return await this.tonClient.isContractDeployed(this.address);
    } catch (e) {
      throw e;
    }
  }

  /**
   * Transfers TONs from the wallet to the specified address.
   *
   * This method transfers TONs from the wallet to the specified address.
   * It first checks if the TonClient instance and the wallet contract are set.
   * If either of them is not set, it attempts to set them by calling the
   * setTonClient and setWalletV4Contract methods. If the key pair is not already
   * set, it attempts to set it by calling the setKeyPair method. If any of the
   * above steps fails, it throws an error. Then, it sends a transfer message
   * using the TonClient instance and waits until the sequence number of the wallet
   * contract is updated.
   *
   * @param address The address to transfer the TONs to.
   * @param value The number of TONs to transfer.
   * @param body The body of the transfer message. Optional.
   * @param bounce Whether the transfer should bounce. Optional, default is false.
   *
   * @throws {Error} If the TonClient instance is not set. Try calling setTonClient() first.
   * @throws {Error} If the wallet contract is not set. Try calling setWalletV4Contract() first.
   * @throws {Error} If the key pair is not set. Try calling setKeyPair() first.
   *
   * @returns {Promise<boolean>} A promise that resolves with a boolean indicating whether the transfer was successful or not.
   */
  async transfer(
    address: string,
    value: number,
    body?: string,
    bounce: boolean = false
  ): Promise<boolean> {
    try {
      if (!this.tonClient) await this.setTonClient();

      if (!this.tonClient) throw new Error(this.TON_CLIENT_ERROR_MESSAGE);

      if (!this.contract) await this.setWalletV4Contract();

      if (!this.contract) throw new Error(this.WALLET_CONTRACT_ERROR_MESSAGE);

      const openedContract: OpenedContract<WalletContractV4> =
        this.tonClient.open(this.contract);
      const currentSeqno: number = await this.getSeqno();

      if (!this.keyPair) await this.setKeyPair();

      if (!this.keyPair) throw new Error(this.KEY_PAIR_ERROR_MESSAGE);

      await openedContract.sendTransfer({
        secretKey: this.keyPair.secretKey,
        seqno: currentSeqno,
        messages: [
          internal({
            to: address,
            value: value.toString(),
            body,
            bounce,
          }),
        ],
      });

      let seqnoWhileTransfer = currentSeqno;

      while (seqnoWhileTransfer === currentSeqno) {
        await sleep(1500);
        seqnoWhileTransfer = await this.getSeqno();
      }

      return true;
    } catch (e) {
      throw e;
    }
  }
}

console.log(
  await new Wallet().transfer(
    "EQA4V9tF4lY2S_J-sEQR7aUj9IwW-Ou2vJQlCn--2DLOLR5e",
    0.01
  )
);

// When using the ".mjs" extension, the JavaScript file is treated as an ECMAScript module by the runtime environment. 
// This means that the code in the file can use import and export statements to load and share code with other modules.

import { promises as fs } from 'fs'; //module for interacting with file system of the current OS.
// A promise is an object representing the eventual completion or failure of an asynchronous operation and its resulting value. It has 3 states: pending, fulfilled and rejected.
import { NetworkEmulator, Program, Address, Tx, ConstrData, NetworkParams, Value, TxOutput} from "@hyperionbt/helios";

//  Main calling function via the command line. Starting point of this program.
async function main() {//async is a keyword that is used to define an asynchronous function
   let optimize = false; 
//    the try...catch statement is used to handle errors that occur during the execution of a block of code. 
// The try block contains the code that might throw an error, and the catch block contains the code that is executed if an error is thrown.
try {
    // Create a new instance of the network emulator
    const network = new NetworkEmulator();

    // ====== Create wallets======
    // Create wallet01 and add 100 Ada
    const wallet01 = network.createWallet(BigInt(100000000));

    // Create a wallet02 and add 5 Ada
    const wallet02 = network.createWallet(BigInt(50000000));
    
    //===== Wait 10 slots for the utxos to be created ====
    network.tick(BigInt(10));


    // ==== Display the Contents of the two wallets =====
    // Now we are able to fetch the utxos at wallet01's address. These can be used to build transactions.
    // UTxos: Unspent Transaction Output that can be used as an input to when builing a transaction. Yet to be spent can be used as a inputs in the current transaction.
    // TxOutput: Represents a transaction output that is used when building a transaction. Already spent so they are outputs of current transaction.
    let wallet01utxos = await wallet01.utxos;
    let wallet02utxos = await network.getUtxos(wallet02.address);
    console.log("************ INITIAL WALLET BALANCES************");

    console.log("Wallet01 UTxOs:");
    for (const utxo of wallet01utxos) {
        console.log("txId", utxo.txId.hex + "#" + utxo.utxoIdx, "value", utxo.value.dump());
        console.log(""); 
    }
    
    console.log("");
    console.log("Wallet02 UTxOs:");
    for (const utxo of wallet02utxos) {
        console.log("txId", utxo.txId.hex + "#" + utxo.utxoIdx, "value", utxo.value.dump());
        console.log(""); 
    } 

   
    // Start building the give transaction
    const give = new Tx();
    // Add UTxOs as inputs
    give.addInput(wallet01utxos[0])
    // Add the script as a witness to the transaction

    give.addOutput(new TxOutput(wallet02.address, new Value(BigInt(50000000))));

    network.tick(BigInt(10));

    // Set Network Parameters
    const networkParamsFile = await fs.readFile('./src/preprod.json', 'utf8');
    const networkParams = new NetworkParams(JSON.parse(networkParamsFile.toString()));

    console.log("");
    console.log("Balancing transaction..............................Done!");
    await give.finalize(networkParams, wallet01.address, wallet01utxos);

    // Submit Tx to the network
    console.log("");
    console.log("Submiting transaction...............................Done!");
    const givetxId = await network.submitTx(give);
    console.log("");
    console.log("Transaction submitted");
    console.log("");
    console.log("Transaction ID:", givetxId.dump());

    // Wait for 10 slots,
    network.tick(BigInt(10));


    wallet01utxos = await network.getUtxos(wallet01.address);
    wallet02utxos = await network.getUtxos(wallet02.address);
    console.log("");
    console.log("************ FINAL WALLET BALANCES************");

    console.log("Wallet01 UTxOs:");
    for (const utxo of wallet01utxos) {
        console.log("txId", utxo.txId.hex + "#" + utxo.utxoIdx, "value", utxo.value.dump());
        console.log(""); 
    }
    
    console.log("");
    console.log("Wallet02 UTxOs:");
    for (const utxo of wallet02utxos) {
        console.log("txId", utxo.txId.hex + "#" + utxo.utxoIdx, "value", utxo.value.dump());
        console.log(""); 
    } 



} catch (err) {
    console.error(err);
}
}


main()

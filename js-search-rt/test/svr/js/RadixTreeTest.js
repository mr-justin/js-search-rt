var RadixTreeTest = TestCase("RadixTreeTest");

RadixTree.prototype.testInsert = function() {
	var radixTree = Object.create(RadixTree, { 
		// RadixTree Object properties 
		keywordCount: { value:0, writable:true, enumerable:true }, 
		dataCount: { value:0, writable:true, enumerable:true }, 
		tree: { value:{}, writable:true, enumerable:true }, 
		//optional properties 
		keySwap: { value:{key:"swap_key"} }
	});
	//TODO: finish testInsert
};

//TODO: finish test cases
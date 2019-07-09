/*
  Copyright 2019 Swap Holdings Ltd.
  
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;

import "@airswap/lib/contracts/Types.sol";

contract ISwap {

  mapping (address => mapping (uint256 => byte)) public makerOrderStatus;
  mapping (address => mapping (address => uint256)) public approvals;
  mapping (address => uint256) public makerMinimumNonce;

  function swap(
    Types.Order calldata order,
    Types.Signature calldata signature
  ) external payable {}

  function swapSimple(
    uint256 nonce,
    uint256 expiry,
    address makerWallet,
    uint256 makerParam,
    address makerToken,
    address takerWallet,
    uint256 takerParam,
    address takerToken,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external payable {}

  function cancel(
    uint256[] calldata nonces
  ) external {}

  function invalidate(
    uint256 minimumNonce
  ) external {}

  function authorize(
    address delegate,
    uint256 expiry
  ) public {}

  function revoke(
    address delegate
  ) public {}

  function isAuthorized(
    address approver,
    address delegate
  ) public view returns (bool) {}

}

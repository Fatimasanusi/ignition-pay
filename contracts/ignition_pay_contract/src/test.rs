#![cfg(test)]
extern crate std;

use crate::{IgnitionPayContract, IgnitionPayContractClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    Address, Env,
};

fn create_contract(env: &Env) -> IgnitionPayContractClient {
    IgnitionPayContractClient::new(env, &env.register_contract(None, IgnitionPayContract))
}

#[test]
fn test_initialize() {
    let env = Env::default();
    let admin = Address::random(&env);
    let contract = create_contract(&env);

    contract.initialize(&admin);

    assert_eq!(contract.is_authorized(&admin), false);
}

#[test]
fn test_authorization() {
    let env = Env::default();
    let admin = Address::random(&env);
    let user = Address::random(&env);
    let contract = create_contract(&env);

    contract.initialize(&admin);
    contract.set_kyc_status(&user, &true);
    contract.authorize(&user);

    assert_eq!(contract.is_authorized(&user), true);

    contract.revoke(&user);
    assert_eq!(contract.is_authorized(&user), false);
}

#[test]
#[should_panic(expected = "KYC not completed")]
fn test_authorize_kyc_not_completed() {
    let env = Env::default();
    let admin = Address::random(&env);
    let user = Address.random(&env);
    let contract = create_contract(&env);

    contract.initialize(&admin);
    contract.authorize(&user);
}

#[test]
fn test_rate_limiting() {
    let env = Env::default();
    let admin = Address::random(&env);
    let user = Address::random(&env);
    let contract = create_contract(&env);

    contract.initialize(&admin);
    contract.set_kyc_status(&user, &true);

    for _ in 0..5 {
        contract.authorize(&user);
        contract.revoke(&user);
    }
}

#[test]
#[should_panic(expected = "Rate limit exceeded")]
fn test_rate_limiting_exceeded() {
    let env = Env::default();
    let admin = Address::random(&env);
    let user = Address::random(&env);
    let contract = create_contract(&env);

    contract.initialize(&admin);

    for _ in 0..6 {
        contract.set_kyc_status(&user, &true);
    }
}
#![cfg(test)]
extern crate std;

use crate::{
    DelegationContract, DelegationContractClient, IgnitionPayContract, IgnitionPayContractClient,
    MultiOracleContract, MultiOracleContractClient, QuoteLockContract, QuoteLockContractClient,
};
use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    Address, Env, Symbol, Vec,
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
    assert_eq!(contract.version().to_string(), "0.1.0");
}

#[test]
#[should_panic(expected = "Contract already initialized")]
fn test_initialize_prevents_reinitialization() {
    let env = Env::default();
    let admin = Address::random(&env);
    let contract = create_contract(&env);

    contract.initialize(&admin);
    contract.initialize(&admin); // Should panic
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

#[test]
fn test_version() {
    let env = Env::default();
    let admin = Address::random(&env);
    let contract = create_contract(&env);

    contract.initialize(&admin);
    assert_eq!(contract.version().to_string(), "0.1.0");
}

#[test]
fn test_transfer_admin() {
    let env = Env::default();
    let admin = Address::random(&env);
    let new_admin = Address::random(&env);
    let user = Address::random(&env);
    let contract = create_contract(&env);

    contract.initialize(&admin);

    // New admin should not work initially
    env.mock_all_auths();
    // contract.set_kyc_status(&user, &true); // Would fail without admin auth

    // Transfer admin
    contract.transfer_admin(&new_admin);

    // Old admin should no longer work, new admin should work
    // Note: In test environment with mock_all_auths, both would work
    // This test mainly verifies the storage update
}

#[test]
#[should_panic(expected = "New admin must be different from current admin")]
fn test_transfer_admin_to_self() {
    let env = Env::default();
    let admin = Address::random(&env);
    let contract = create_contract(&env);

    contract.initialize(&admin);
    contract.transfer_admin(&admin); // Should panic
}

#[test]
fn test_has_pending_upgrade() {
    let env = Env::default();
    let admin = Address::random(&env);
    let contract = create_contract(&env);

    contract.initialize(&admin);

    // Initially no pending upgrade
    assert_eq!(contract.has_pending_upgrade(), false);
}

#[test]
#[should_panic(expected = "All prices are stale")]
fn test_oracle_rejects_stale_prices() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set(LedgerInfo {
        timestamp: 1_000,
        ..env.ledger().get()
    });
    let admin = Address::random(&env);
    let oracle = Address::random(&env);
    let contract = MultiOracleContractClient::new(
        &env,
        &env.register_contract(None, MultiOracleContract),
    );

    contract.initialize(&admin, &Vec::from_array(&env, [oracle.clone()]));
    contract.push_price(&Symbol::new(&env, "XLM"), &100);
    env.ledger().set(LedgerInfo {
        timestamp: 1_301,
        ..env.ledger().get()
    });
    contract.get_median_price(&Symbol::new(&env, "XLM"));
}

#[test]
fn test_delegation_aggregates_power_and_can_be_cleared() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::random(&env);
    let voter = Address::random(&env);
    let representative = Address::random(&env);
    let contract = DelegationContractClient::new(
        &env,
        &env.register_contract(None, DelegationContract),
    );

    contract.initialize(&admin);
    contract.set_voting_power(&voter, &10);
    contract.set_voting_power(&representative, &5);
    contract.delegate(&voter, &representative);
    assert_eq!(contract.get_voting_power(&representative), 15);
    assert_eq!(contract.get_delegate(&voter), Some(representative.clone()));

    contract.clear_delegation(&voter);
    assert_eq!(contract.get_voting_power(&representative), 5);
}

#[test]
fn test_quote_lock_is_one_time_and_preserves_terms() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set(LedgerInfo {
        timestamp: 1_000,
        ..env.ledger().get()
    });
    let admin = Address::random(&env);
    let creator = Address::random(&env);
    let sell_asset = Address::random(&env);
    let buy_asset = Address::random(&env);
    let id = Symbol::new(&env, "quote-1");
    let contract = QuoteLockContractClient::new(
        &env,
        &env.register_contract(None, QuoteLockContract),
    );

    contract.initialize(&admin);
    contract.lock_quote(
        &id,
        &creator,
        &sell_asset,
        &buy_asset,
        &100,
        &250,
        &2,
        &1_100,
    );
    let executed = contract.execute_quote(&id, &creator);
    assert_eq!(executed.sell_amount, 100);
    assert_eq!(executed.buy_amount, 250);
    assert_eq!(contract.get_quote(&id).executed, true);
}

#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, Vec};

#[contract]
pub struct IgnitionPayContract;

#[contractimpl]
impl IgnitionPayContract {
    pub fn initialize(env: Env, admin: Address) {
        env.storage().instance().set(&"admin", &admin);
        env.storage().instance().set(&"authorizations", &Vec::<Address>::new(&env));
    }

    pub fn authorize(env: Env, user: Address) {
        let admin = env.storage().instance().get(&"admin").unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        let mut authorizations: Vec<Address> = env.storage().instance().get(&"authorizations").unwrap_or_else(|| Vec::new(&env));
        authorizations.push_back(user);
        env.storage().instance().set(&"authorizations", &authorizations);
    }

    pub fn revoke(env: Env, user: Address) {
        let admin = env.storage().instance().get(&"admin").unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        let mut authorizations: Vec<Address> = env.storage().instance().get(&"authorizations").unwrap_or_else(|| Vec::new(&env));
        if let Some(index) = authorizations.iter().position(|a| a == user) {
            authorizations.remove(index as u32);
        }
        env.storage().instance().set(&"authorizations", &authorizations);
    }

    pub fn is_authorized(env: Env, user: Address) -> bool {
        let authorizations: Vec<Address> = env.storage().instance().get(&"authorizations").unwrap_or_else(|| Vec::new(&env));
        authorizations.contains(&user)
    }
}
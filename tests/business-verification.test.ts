import { describe, it, expect, beforeEach } from 'vitest';

// Mock implementation for testing Clarity contracts
const mockClarity = () => {
  let state = {
    businesses: {},
    authorizedVerifiers: {},
    contractOwner: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM' // Example principal
  };
  
  const tx = {
    sender: state.contractOwner
  };
  
  return {
    state,
    tx,
    // Mock functions that simulate contract behavior
    registerBusiness: (businessId, name, address, contact) => {
      if (state.businesses[businessId]) {
        return { error: 101 }; // ERR-ALREADY-REGISTERED
      }
      
      state.businesses[businessId] = {
        name,
        address,
        contact,
        verified: false,
        verificationDate: null,
        verifier: null
      };
      
      return { success: true };
    },
    
    verifyBusiness: (businessId, verifier) => {
      if (!state.authorizedVerifiers[verifier] || !state.authorizedVerifiers[verifier].active) {
        return { error: 100 }; // ERR-NOT-AUTHORIZED
      }
      
      if (!state.businesses[businessId]) {
        return { error: 102 }; // ERR-NOT-FOUND
      }
      
      state.businesses[businessId].verified = true;
      state.businesses[businessId].verificationDate = Date.now();
      state.businesses[businessId].verifier = verifier;
      
      return { success: true };
    },
    
    addVerifier: (verifier, sender) => {
      if (sender !== state.contractOwner) {
        return { error: 100 }; // ERR-NOT-AUTHORIZED
      }
      
      state.authorizedVerifiers[verifier] = { active: true };
      return { success: true };
    },
    
    isBusinessVerified: (businessId) => {
      return state.businesses[businessId]?.verified || false;
    }
  };
};

describe('Business Verification Contract', () => {
  let clarity;
  
  beforeEach(() => {
    clarity = mockClarity();
  });
  
  it('should register a new business', () => {
    const result = clarity.registerBusiness(
        'b123',
        'Acme Corp',
        '123 Main St',
        'contact@acme.com'
    );
    
    expect(result.success).toBe(true);
    expect(clarity.state.businesses['b123']).toBeDefined();
    expect(clarity.state.businesses['b123'].name).toBe('Acme Corp');
    expect(clarity.state.businesses['b123'].verified).toBe(false);
  });
  
  it('should not register a business twice', () => {
    clarity.registerBusiness(
        'b123',
        'Acme Corp',
        '123 Main St',
        'contact@acme.com'
    );
    
    const result = clarity.registerBusiness(
        'b123',
        'Acme Corp 2',
        '456 Main St',
        'contact2@acme.com'
    );
    
    expect(result.error).toBe(101); // ERR-ALREADY-REGISTERED
  });
  
  it('should add an authorized verifier', () => {
    const verifier = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const result = clarity.addVerifier(verifier, clarity.state.contractOwner);
    
    expect(result.success).toBe(true);
    expect(clarity.state.authorizedVerifiers[verifier].active).toBe(true);
  });
  
  it('should verify a business when authorized', () => {
    const verifier = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    clarity.addVerifier(verifier, clarity.state.contractOwner);
    
    clarity.registerBusiness(
        'b123',
        'Acme Corp',
        '123 Main St',
        'contact@acme.com'
    );
    
    const result = clarity.verifyBusiness('b123', verifier);
    
    expect(result.success).toBe(true);
    expect(clarity.state.businesses['b123'].verified).toBe(true);
    expect(clarity.state.businesses['b123'].verifier).toBe(verifier);
  });
  
  it('should check if a business is verified', () => {
    const verifier = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    clarity.addVerifier(verifier, clarity.state.contractOwner);
    
    clarity.registerBusiness(
        'b123',
        'Acme Corp',
        '123 Main St',
        'contact@acme.com'
    );
    
    expect(clarity.isBusinessVerified('b123')).toBe(false);
    
    clarity.verifyBusiness('b123', verifier);
    
    expect(clarity.isBusinessVerified('b123')).toBe(true);
  });
});

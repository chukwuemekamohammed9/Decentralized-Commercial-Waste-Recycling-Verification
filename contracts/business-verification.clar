;; Business Verification Contract
;; Validates commercial waste generators

(define-data-var contract-owner principal tx-sender)

;; Data structure for business information
(define-map businesses
  { business-id: (string-ascii 36) }
  {
    name: (string-ascii 100),
    address: (string-ascii 100),
    contact: (string-ascii 100),
    verified: bool,
    verification-date: (optional uint),
    verifier: (optional principal)
  }
)

;; List of authorized verifiers
(define-map authorized-verifiers
  { verifier: principal }
  { active: bool }
)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-ALREADY-REGISTERED u101)
(define-constant ERR-NOT-FOUND u102)

;; Initialize contract
(define-public (initialize)
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-NOT-AUTHORIZED))
    (ok true)
  )
)

;; Add a verifier
(define-public (add-verifier (verifier principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-NOT-AUTHORIZED))
    (map-set authorized-verifiers { verifier: verifier } { active: true })
    (ok true)
  )
)

;; Remove a verifier
(define-public (remove-verifier (verifier principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-NOT-AUTHORIZED))
    (map-set authorized-verifiers { verifier: verifier } { active: false })
    (ok true)
  )
)

;; Check if a principal is an authorized verifier
(define-read-only (is-authorized-verifier (verifier principal))
  (default-to false (get active (map-get? authorized-verifiers { verifier: verifier })))
)

;; Register a new business
(define-public (register-business
    (business-id (string-ascii 36))
    (name (string-ascii 100))
    (address (string-ascii 100))
    (contact (string-ascii 100)))
  (begin
    (asserts! (is-none (map-get? businesses { business-id: business-id })) (err ERR-ALREADY-REGISTERED))
    (map-set businesses
      { business-id: business-id }
      {
        name: name,
        address: address,
        contact: contact,
        verified: false,
        verification-date: none,
        verifier: none
      }
    )
    (ok true)
  )
)

;; Verify a business
(define-public (verify-business (business-id (string-ascii 36)))
  (let ((business-data (map-get? businesses { business-id: business-id })))
    (begin
      (asserts! (is-authorized-verifier tx-sender) (err ERR-NOT-AUTHORIZED))
      (asserts! (is-some business-data) (err ERR-NOT-FOUND))
      (map-set businesses
        { business-id: business-id }
        (merge (unwrap-panic business-data)
          {
            verified: true,
            verification-date: (some block-height),
            verifier: (some tx-sender)
          }
        )
      )
      (ok true)
    )
  )
)

;; Get business information
(define-read-only (get-business-info (business-id (string-ascii 36)))
  (map-get? businesses { business-id: business-id })
)

;; Check if a business is verified
(define-read-only (is-business-verified (business-id (string-ascii 36)))
  (default-to false (get verified (map-get? businesses { business-id: business-id })))
)

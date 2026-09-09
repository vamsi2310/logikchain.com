# Content type: YAML (OpenAPI 3.0)

openapi: 3.0.0
info:
  title: Logikchain API Specification
  description: >-
    Complete OpenAPI 3.0.0 specification for Logikchain's Firebase Functions 2nd gen
    (callable, HTTPS REST, and scheduled exports). These endpoints enforce security boundaries, transactional integrity,
    and offline sync for the Logikchain rural logistics platform, including cash custody, handover
    verification and settlement, provider-confirmed payment and payout transaction lifecycles,
    reconciliation and accounting-period close, and Support-managed geographic and entitlement-bearing
    subscription configuration for logikchain.com.


    Two conventions run through every money endpoint. First, `success` means the call completed,
    not that money moved; the transaction status field on the response is the only statement about
    funds. Second, every state-changing money call carries an idempotency key and is safe to replay,
    returning the original outcome rather than performing the act twice.
    HTTP contract is REST under `/v1` (GET / POST / PATCH / PUT / DELETE). operationId is the Firebase Function export. Security per operation is `x-logikchain-security` and `constitution/Logikchain_API_Specifications.md` §0B.
  version: 1.6.0
servers:
  - url: http://localhost:5001/logikchain-dev/asia-south1
    description: Local Firebase Emulator Suite
  - url: https://asia-south1-logikchain-dev.cloudfunctions.net
    description: Firebase Functions 2nd gen — alias dev
  - url: https://asia-south1-logikchain-test.cloudfunctions.net
    description: Firebase Functions 2nd gen — alias test
  - url: https://asia-south1-logikchain-prod.cloudfunctions.net
    description: Firebase Functions 2nd gen — alias prod (CI only)
security:
  - BearerAuth: []
    AppCheck: []
paths:
  /v1/suppliers:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support
        status: approved
        resource: none — creates the supplier
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Manually create a Supplier account
      description: Allows Support agents to manually provision and approve new Supplier profiles on the platform.
      operationId: createSupplier
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateSupplierRequest'
      responses:
        '200':
          description: Supplier successfully created.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CreateSupplierResponse'
        '400':
          description: Invalid request parameters or already exists.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller lacks the Support role.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/buyers/{buyerId}/role:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: supplier
        status: approved
        resource: target buyer must be in the caller's network
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Upgrade an approved Buyer to Merchant or Driver
      description: Allows Suppliers to dynamically upgrade an existing approved Buyer within their network to either a Merchant or a Driver (Vehicle), instantly approved.
      operationId: convertBuyerToRole
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ConvertBuyerToRoleRequest'
      responses:
        '200':
          description: User successfully upgraded.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ConvertBuyerToRoleResponse'
        '400':
          description: Invalid state or invalid request parameters.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller lacks the Supplier role.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Target user profile not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/users/{userId}:
    patch:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: any approved (self); support (any)
        status: approved
        resource: self unless support
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Update a user profile
      description: Applies self-service profile edits (address, shop details, GSTIN, driver vehicle details, device permissions) through a server-side allow-list. Support may target another user. Payout destinations are deliberately outside this allow-list; they move only through registerPayoutBeneficiary, which carries step-up authentication, rail verification, and a cooling period.
      operationId: updateUserProfile
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateUserProfileRequest'
      responses:
        '200':
          description: Profile successfully updated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UpdateUserProfileResponse'
        '400':
          description: Field is not writable for the caller's role, a payout destination field was supplied, or the GSTIN is malformed.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller attempted to edit another user without the Support role.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Target profile, referenced Village, or selected Merchant not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/merchants/{merchantId}:disassociate:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: supplier (managing), support
        status: approved
        resource: supplier must manage the merchant
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Disassociate a Merchant from a Supplier network
      description: Removes a Merchant from a Supplier's network, suspending the merchant's in-flight Buyer and Merchant orders and notifying everyone affected.
      operationId: disassociateMerchant
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DisassociateMerchantRequest'
      responses:
        '200':
          description: Merchant successfully disassociated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DisassociateMerchantResponse'
        '400':
          description: Target profile is not a Merchant of this Supplier, or reason is empty.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller does not manage this Merchant.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Merchant profile not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/gigs:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: supplier
        status: approved
        resource: owns route, pamphlet, merchants
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Compose and schedule a new Gig
      description: Creates and schedules a new routing Gig with an assigned driver, route, pamphlet, and local merchants.
      operationId: composeGig
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ComposeGigRequest'
      responses:
        '200':
          description: Gig successfully composed.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ComposeGigResponse'
        '400':
          description: Invalid request parameters or driver not available.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not a supplier.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Route, vehicle profile, or pamphlet not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/gigs/{gigId}:start:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: vehicle (assigned)
        status: approved
        resource: vehicleId == caller
        officialClient: android-if-vehicle
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Start an assigned Gig
      description: Triggers the active state transition of a Gig when the driver begins the route.
      operationId: startGig
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/StartGigRequest'
      responses:
        '200':
          description: Gig successfully started.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StartGigResponse'
        '400':
          description: Invalid Gig state. Gig has already started or completed.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not the assigned driver.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Gig not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/gigs/{gigId}/location:
    patch:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: vehicle (assigned)
        status: approved
        resource: vehicleId == caller
        officialClient: android-if-vehicle
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Update active Gig location and status
      description: Updates current village index and state during route execution, and alerts buyers of arrival.
      operationId: updateGigLocation
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateGigLocationRequest'
      responses:
        '200':
          description: Gig location successfully updated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UpdateGigLocationResponse'
        '400':
          description: Invalid index or index out of bounds.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not the assigned driver.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Gig not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/gigs/{gigId}:complete:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: vehicle (assigned), supplier, support
        status: approved
        resource: assigned driver or owning supplier
        officialClient: android-if-vehicle
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Finalize and close a completed Gig
      description: Closes an active Gig, verifies deliveries, and records driver earnings.
      operationId: completeAndFinalizeGig
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CompleteAndFinalizeGigRequest'
      responses:
        '200':
          description: Gig successfully finalized.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CompleteAndFinalizeGigResponse'
        '400':
          description: Pending deliveries remain, a custody transfer for this Gig is still pending verification, or Gig is already completed.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not authorized.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Gig not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/gigs/{gigId}:suspend:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: supplier (owner), support
        status: approved
        resource: owning supplier
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Suspend an in-flight Gig
      description: Halts a Gig after a vehicle breakdown or driver unavailability and suspends the orders riding on it until a replacement driver is assigned.
      operationId: suspendGig
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SuspendGigRequest'
      responses:
        '200':
          description: Gig successfully suspended.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SuspendGigResponse'
        '400':
          description: Invalid Gig state. Gig is already completed or suspended, or reason is empty.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller does not own this Gig.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Gig not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/gigs/{gigId}/driver:
    patch:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: supplier (owner), support
        status: approved
        resource: owning supplier; gig must be suspended
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Reassign a suspended Gig to a new driver
      description: Assigns a replacement driver to a suspended Gig and resumes tracking from the last visited village index.
      operationId: reassignGigDriver
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ReassignGigDriverRequest'
      responses:
        '200':
          description: Gig successfully reassigned.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReassignGigDriverResponse'
        '400':
          description: Gig is not suspended, or the replacement driver is unavailable or already assigned.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller does not own this Gig.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Gig or replacement driver profile not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/orders:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: buyer
        status: approved
        resource: buyer is the caller
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Place a new Buyer Order
      description: >-
        Refuses any line that is not on this gig's pamphlet for a village this
        gig stops in (`NOT_SERVICEABLE`), validates warehouse stock atomically
        (`OUT_OF_STOCK`), prices from the pamphlet discountedPrice, applies
        discount, and processes buyer order placement.
      operationId: placeOrder
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PlaceOrderRequest'
      responses:
        '200':
          description: Order successfully placed.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PlaceOrderResponse'
        '400':
          description: Out of stock, invalid discount code, supplier has no registered GSTIN, or paymentMode is not online or cash_on_pickup.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not a buyer.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Product or Gig not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '409':
          description: >-
            NOT_SERVICEABLE — gig is not created/started, village is not a stop,
            buyer villageId disagrees, merchant is not on this gig in this
            village, or a productId is not on the gig pamphlet.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/orders/{orderId}:cancel:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: buyer (owner), merchant (assigned), supplier, support
        status: approved
        resource: party to the order
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Cancel an existing Buyer Order
      description: Cancels a buyer order, restoring product stock levels.
      operationId: cancelOrder
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CancelOrderRequest'
      responses:
        '200':
          description: Order successfully cancelled.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CancelOrderResponse'
        '400':
          description: Order is unalterable (already delivered or cancelled).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is unauthorized to cancel this order.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Order not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/orders/{orderId}:deliver:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: vehicle (gig driver), merchant (assigned)
        status: approved
        resource: assigned driver or merchant
        officialClient: android-if-vehicle
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Mark a Buyer Order delivered with proof
      description: The single server-side path that closes out a buyer order with a verified delivery proof, and on a cash_on_pickup order records the collected cash into the collecting party's custody. Callable by the assigned driver or the assigned merchant, so the Merchant Delivered action never writes Order.deliveryStatus directly.
      operationId: markOrderDelivered
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MarkOrderDeliveredRequest'
      responses:
        '200':
          description: Order successfully marked delivered.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MarkOrderDeliveredResponse'
        '400':
          description: Order has not reached the merchant, proof is incomplete or fails verification against the buyer's pickup code, cashCollected does not equal the order total, or the idempotency key was already used for a different order or amount.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is neither the assigned driver nor the assigned merchant.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Order, associated Gig, or pickup code record not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/merchant-orders:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: merchant
        status: approved
        resource: merchant is the caller
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Place a bulk Merchant Order
      description: Processes bulk merchant purchases, decrementing stock and validating credit.
      operationId: placeMerchantOrder
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PlaceMerchantOrderRequest'
      responses:
        '200':
          description: Merchant order successfully placed.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PlaceMerchantOrderResponse'
        '400':
          description: Out of stock, insufficient credit limit, supplier has no registered GSTIN, or paymentMode is unrecognized or disagrees with payWithCredit.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not an approved merchant.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Product, supplier, or merchant credit profile not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/merchant-orders/{merchantOrderId}/status:
    patch:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: vehicle (serving gig), merchant (recipient, delivered only), supplier (owner), support
        status: approved
        resource: named on the order
        officialClient: android-if-vehicle
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Advance a Merchant Order status
      description: Advances a bulk merchant order through reached and delivered, capturing a delivery proof on the final transition.
      operationId: updateMerchantOrderStatus
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateMerchantOrderStatusRequest'
      responses:
        '200':
          description: Merchant order status successfully updated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UpdateMerchantOrderStatusResponse'
        '400':
          description: Illegal status transition, missing / invalid delivery proof or idempotency key, proof fails verification against the merchant's handover code, or cashCollected does not equal the order total.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not the supplier, the serving driver, the recipient merchant, or Support.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Merchant order or handover code record not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/merchant-orders/{merchantOrderId}:cancel:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: merchant (owner), supplier (owner), support
        status: approved
        resource: owner
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Cancel a Merchant Order
      description: Cancels a bulk merchant order, restoring product stock and releasing any credit the order consumed.
      operationId: cancelMerchantOrder
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CancelMerchantOrderRequest'
      responses:
        '200':
          description: Merchant order successfully cancelled.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CancelMerchantOrderResponse'
        '400':
          description: Order is unalterable, or a merchant attempted to cancel an order that already reached them.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller unauthorized to cancel this merchant order.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Merchant order or credit profile not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/credit-profiles/{merchantId}/increase-requests:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: merchant
        status: approved
        resource: own credit profile
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Request a credit limit increase
      description: Submits a merchant credit limit raise request for review.
      operationId: requestCreditIncrease
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RequestCreditIncreaseRequest'
      responses:
        '200':
          description: Credit increase request successfully submitted.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RequestCreditIncreaseResponse'
        '400':
          description: Duplicate pending request or invalid requested amount.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not an approved merchant.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/credit-profiles/{merchantId}/limit:
    put:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: supplier (managing), support
        status: approved
        resource: managing supplier
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Set a Merchant credit limit
      description: Sets a Merchant's absolute credit limit and recomputes available credit. This is the function that lifts a newly converted Merchant off the zero limit provisioned by convertBuyerToRole.
      operationId: setMerchantCreditLimit
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SetMerchantCreditLimitRequest'
      responses:
        '200':
          description: Credit limit successfully updated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SetMerchantCreditLimitResponse'
        '400':
          description: Negative limit, new limit is below the merchant's current credit used, or the target profile is not an approved Merchant.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller does not manage this Merchant.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Merchant profile or credit profile not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/credit-increase-requests/{requestId}:
    patch:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: supplier (managing), support
        status: approved
        resource: managing supplier of that merchant
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Approve or reject a credit increase request
      description: Approves or rejects a pending Merchant credit increase request, applying the new limit to the credit profile in the same transaction on approval.
      operationId: reviewCreditIncreaseRequest
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ReviewCreditIncreaseRequestRequest'
      responses:
        '200':
          description: Credit increase request successfully reviewed.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReviewCreditIncreaseRequestResponse'
        '400':
          description: Request already reviewed, approved amount exceeds the requested amount, or rejection reason is missing.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller does not manage the requesting Merchant.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Credit increase request or credit profile not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/payment-intents:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: buyer (own order), merchant (own order/credit/subscription), supplier (own subscription)
        status: approved
        resource: payer is the caller
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Open a server-priced gateway payment intent
      description: Prices a gateway payment server-side and returns the gateway order the client must present. The amount is derived from platform state and never taken from the request.
      operationId: createPaymentIntent
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreatePaymentIntentRequest'
      responses:
        '200':
          description: Payment intent successfully created, or an equivalent open intent returned.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CreatePaymentIntentResponse'
        '400':
          description: Order is not an unpaid online order, the merchant has no outstanding credit to repay, the derived amount is not positive, the requested amount exceeds the outstanding payable balance, or the gateway rejected the order creation.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller does not own the target order, credit line, or subscription.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Order, credit profile, or subscription not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/payment-intents/{intentId}:capture:
    post:
      x-logikchain-security:
        auth: bearer-or-webhook
        appCheck: required on the callable path; not applicable on the webhook path
        roles: buyer or merchant (own intent); or provider webhook
        status: approved (callable)
        resource: own intent; webhook is signature-only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Confirm a payment intent against a gateway callback
      description: Confirms a PaymentIntent against a signature-verified gateway callback, and on a merchant credit repayment relieves the credit line and notifies the supplier. Callable by the paying buyer or merchant, or invoked by the payment gateway webhook.
      operationId: processPayment
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProcessPaymentRequest'
      responses:
        '200':
          description: Payment successfully processed. A gateway event id already applied is answered here as a no-op carrying the intent's current status.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProcessPaymentResponse'
        '400':
          description: Invalid gateway signature, intent is already in a terminal status, the gateway amount does not equal the intent amount, or the transaction was rejected by the gateway.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Callable caller does not own this payment intent.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Payment intent, target order, or credit profile not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/orders/{orderId}/refunds:
    post:
      x-logikchain-security:
        auth: bearer-or-webhook
        appCheck: required on the callable path; not applicable on the webhook path
        roles: buyer (owner), supplier (managing), support; or refund webhook
        status: approved (callable)
        resource: party to the order
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Refund a paid Buyer Order
      description: Returns money to a buyer on a cancelled or suspended order that was already paid, calling the Razorpay refunds API and reconciling the gateway callback.
      operationId: refundOrder
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RefundOrderRequest'
      responses:
        '200':
          description: Refund successfully initiated or settled.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RefundOrderResponse'
        '400':
          description: Order is unpaid, already refunded, still deliverable, or the amount exceeds the order total.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is neither the buyer, the managing supplier, nor Support.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Order not found, or the order has no gateway payment reference.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/payout-requests:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: vehicle
        status: approved
        resource: own DriverEarnings
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Request driver payout
      description: Files a driver payout request against withdrawable earnings, reserving the amount rather than deducting it and freezing the destination as a snapshot so a later profile edit cannot retarget the money.
      operationId: requestPayout
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RequestPayoutRequest'
      responses:
        '200':
          description: Payout request successfully filed.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RequestPayoutResponse'
        '400':
          description: Insufficient withdrawable dues, invalid requested amount, no verified beneficiary registered, beneficiary blocked, another request already open, or unsettled supplier cash still in the driver's custody.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not an approved vehicle driver.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/beneficiaries:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: vehicle (own destination)
        status: approved
        resource: own UID
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Register a verified payout destination
      description: Registers and verifies a UPI or bank payout destination for the caller. Verification is performed against the rail before the destination becomes usable, and a cooling period applies before any payout may be initiated to it. Sensitive identifiers are stored encrypted and only ever returned masked.
      operationId: registerPayoutBeneficiary
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RegisterPayoutBeneficiaryRequest'
      responses:
        '200':
          description: Beneficiary registered; verification may still be pending.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RegisterPayoutBeneficiaryResponse'
        '400':
          description: Malformed VPA or IFSC, account number confirmation mismatch, name mismatch beyond tolerance, or destination already blocked.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated, or the step-up re-authentication token is missing or expired.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller may not hold a payout destination.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '409':
          description: A payout is currently in flight; the destination cannot be changed until it settles.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/beneficiaries/{beneficiaryId}:block:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: supplier (managing), support
        status: approved
        resource: manages that driver
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Block a payout destination
      description: Blocks a payout destination on suspicion of fraud or on a verified rail failure, and holds every approved-but-uninitiated payout pointing at it. Support and Admin only.
      operationId: blockPayoutBeneficiary
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BlockPayoutBeneficiaryRequest'
      responses:
        '200':
          description: Destination blocked and dependent payouts held.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BlockPayoutBeneficiaryResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not Support or Admin.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Beneficiary not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/payout-requests/{payoutRequestId}:
    patch:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: supplier (managing), support — never the requesting driver
        status: approved
        resource: managing supplier of that driver
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Approve or reject a driver payout request
      description: Approves or rejects a driver payout request. Approval authorises a PayoutTransaction and never asserts that money has moved; the reservation is released back to pending dues on rejection. The approver must be a different user from the requester and must echo the masked destination they were shown.
      operationId: reviewPayoutRequest
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ReviewPayoutRequestRequest'
      responses:
        '200':
          description: Payout request successfully reviewed.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReviewPayoutRequestResponse'
        '400':
          description: Request already reviewed, rejection reason missing, destination unverified or still in its cooling period, or the acknowledged destination label does not match the frozen snapshot.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller does not manage this Driver, or is the same user who raised the request.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Driver profile, earnings document, or payout request entry not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/internal/payouts/{payoutTransactionId}:initiate:
    post:
      x-logikchain-security:
        auth: system
        appCheck: not applicable
        roles: none — system
        status: n/a
        resource: not client-invocable
        officialClient: n/a
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Initiate an approved payout on the payout rail
      description: Server-only. Submits an approved PayoutTransaction to the payout rail under a stable idempotency key, moving it from approved to initiated. Never callable from a client; approval and initiation are deliberately separate acts.
      operationId: initiatePayoutTransfer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/InitiatePayoutTransferRequest'
      responses:
        '200':
          description: Transfer submitted to the rail.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InitiatePayoutTransferResponse'
        '400':
          description: Payout is not in the approved state, destination is unverified, blocked, or still cooling, or the period is closed.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. This endpoint is not exposed to client callers.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '409':
          description: A transfer for this payout is already in flight.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '503':
          description: Rail unavailable or float insufficient. The payout stays approved and is retried.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/webhooks/payout-settlement:
    post:
      x-logikchain-security:
        auth: webhook-or-support
        appCheck: required on the support path; not applicable on the webhook path
        roles: provider webhook (signature); support (manual UTR, fallback rail only)
        status: n/a (webhook) / approved (support)
        resource: signature or support second verifier
        officialClient: n/a
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Record the terminal outcome of a payout
      description: Applies a rail-confirmed success, failure, or reversal to a PayoutTransaction. A success is refused without a UTR. Failures and reversals release the reservation back to the earner's withdrawable dues. Invoked by the signed provider webhook or, for manual bank transfers, by an authorised finance actor.
      operationId: recordPayoutSettlement
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RecordPayoutSettlementRequest'
      responses:
        '200':
          description: Outcome recorded, or acknowledged as a duplicate of one already recorded.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RecordPayoutSettlementResponse'
        '400':
          description: UTR missing on a success outcome, transition not legal from the current state, or signature invalid.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is neither the verified provider nor an authorised finance actor.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: PayoutTransaction not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/payouts/{payoutTransactionId}:verify-manual:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support, excluding utrEnteredBy
        status: approved
        resource: second support actor
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Second-actor verification of a manual bank transfer
      description: Confirms a manual bank transfer by independently re-entering the UTR. The verifier must differ from the actor who recorded the transfer, and the re-entered UTR must match exactly. Only this call moves a manual payout to completed.
      operationId: verifyManualPayout
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/VerifyManualPayoutRequest'
      responses:
        '200':
          description: Manual payout verified and completed.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VerifyManualPayoutResponse'
        '400':
          description: UTR mismatch, payout not awaiting verification, or the accounting period is closed.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller recorded the transfer and may not also verify it.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: PayoutTransaction not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/payouts/{payoutTransactionId}:retry:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: supplier (managing), support
        status: approved
        resource: managing supplier
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Retry a failed payout
      description: Creates a fresh PayoutTransaction that supersedes a failed one, optionally against a different verified destination. A retry is never a re-run of the original provider reference, so a late success on the original cannot double-pay.
      operationId: retryPayout
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RetryPayoutRequest'
      responses:
        '200':
          description: Retry transaction created.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RetryPayoutResponse'
        '400':
          description: Original payout is not in a failed state, or the substitute destination is unverified or blocked.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller may not authorise payouts for this earner.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: PayoutTransaction not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/webhooks/gateway:
    post:
      x-logikchain-security:
        auth: webhook
        appCheck: not applicable
        roles: payment and payout provider webhooks only
      security: []
      summary: Receive a signed provider event
      description: Single signed ingress for payment, refund, payout, subscription, and settlement events. Signature and replay window are checked before any state is read, the provider event ID is consumed exactly once, and an event that contradicts platform state opens a reconciliation exception instead of overwriting the record.
      operationId: handleGatewayWebhook
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GatewayWebhookRequest'
      responses:
        '200':
          description: Event accepted. Also returned for a duplicate, so the provider stops retrying.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GatewayWebhookResponse'
        '400':
          description: Malformed payload or timestamp outside the replay window.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Signature verification failed.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error. The provider should retry.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/reconciliation-runs:
    post:
      x-logikchain-security:
        auth: scheduler-or-support
        appCheck: required on the support path; not applicable on the scheduler path
        roles: scheduler; support (manual re-run)
        status: approved (support)
        resource: support or scheduler
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Run three-way reconciliation for a business date
      description: Matches platform records against provider reports and bank statements for the given date and scope, recording matches and opening exceptions for every break. Reconciliation is evidence, so a run over a closed period is refused.
      operationId: runReconciliation
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RunReconciliationRequest'
      responses:
        '200':
          description: Reconciliation completed, possibly with exceptions.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RunReconciliationResponse'
        '400':
          description: Source report unavailable for the date, or a re-run was requested over a closed period.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller lacks the reconciliation management entitlement or role.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/reconciliation-exceptions/{exceptionId}:
    patch:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support
        status: approved
        resource: support only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Resolve a reconciliation break
      description: Closes a reconciliation exception with an explicit resolution and mandatory narrative. Write-offs above the configured threshold require a second approver who did not raise the resolution.
      operationId: resolveReconciliationException
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ResolveReconciliationExceptionRequest'
      responses:
        '200':
          description: Exception resolved, or held pending a second approval.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ResolveReconciliationExceptionResponse'
        '400':
          description: Resolution not valid for this exception kind, note missing, or adjustment amount absent on a write-off.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied, or the caller is the same actor who requested the write-off.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Exception not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/accounting-periods/{periodId}:close:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support
        status: approved
        resource: support only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Close an accounting period
      description: Locks a period against back-dated financial writes and stores the close evidence bundle. The close is refused while any reconciliation exception for the period remains open.
      operationId: closeAccountingPeriod
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CloseAccountingPeriodRequest'
      responses:
        '200':
          description: Period closed.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CloseAccountingPeriodResponse'
        '400':
          description: Period already closed, dates invalid, or a prior period is still open.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not an authorised period closer.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '409':
          description: Open reconciliation exceptions block the close; their IDs are returned.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CloseAccountingPeriodResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/accounting-periods/{periodId}:reopen:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support
        status: approved
        resource: support only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Reopen a closed accounting period
      description: Reopens a closed period with a recorded reason. Every reopen is counted and surfaced in the close evidence, because a reopened period is an exception rather than a routine correction path.
      operationId: reopenAccountingPeriod
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ReopenAccountingPeriodRequest'
      responses:
        '200':
          description: Period reopened.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReopenAccountingPeriodResponse'
        '400':
          description: Period is not closed, or a later period has since been closed.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Reopening is restricted to Admin.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Accounting period not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/credit-notes:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support; also invoked internally by refundOrder and cancelMerchantOrder
        status: approved
        resource: support or internal
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Issue a GST credit note
      description: Raises a credit note against an already-issued invoice, drawing from a gapless per-financial-year series. Issued invoices are never edited or deleted; a correction is always a credit note.
      operationId: issueCreditNote
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/IssueCreditNoteRequest'
      responses:
        '200':
          description: Credit note issued.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/IssueCreditNoteResponse'
        '400':
          description: Credit exceeds the invoice value net of earlier notes, tax split inconsistent with the place of supply, or the invoice period is closed.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller may not issue credit notes for this invoice.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Invoice not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/tax-profiles/{taxProfileId}:
    put:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support
        status: approved
        resource: support only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Publish a supplier tax profile
      description: Creates or versions the GST registration and place-of-supply rules a supplier's invoices and credit notes are built from. A profile that has already priced a document is never edited in place; a change is a new version with its own effective window.
      operationId: upsertTaxProfile
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpsertTaxProfileRequest'
      responses:
        '200':
          description: Tax profile saved, with a worked resolution preview per document class.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UpsertTaxProfileResponse'
        '400':
          description: GSTIN malformed or disagreeing with the registered state code, default GST rate not one of the permitted rates, or an in-place edit was attempted on a profile that has already priced documents.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not Support.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '409':
          description: Another active profile for this supplier already covers part of the requested effective window.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/tds-configurations/{configId}:
    put:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support
        status: approved
        resource: support only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Configure statutory TDS withholding
      description: Turns withholding on or off and versions the rates and thresholds it runs under. Enabling it requires a deductor TAN and a recorded tax-adviser confirmation, and returns the driver-level impact before the change takes effect.
      operationId: upsertTdsConfiguration
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpsertTdsConfigurationRequest'
      responses:
        '200':
          description: Configuration version written, with the projected impact of the saved settings.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UpsertTdsConfigurationResponse'
        '400':
          description: Withholding was enabled without a deductor TAN and a recorded adviser confirmation, the without-PAN rate is below the with-PAN rate, a threshold is negative, or the effective date is back-dated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not Support.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/tds/challans:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support
        status: approved
        resource: support only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Record a TDS deposit challan
      description: Records evidence that withheld tax was deposited and advances the deductions it covers. The challan total must equal the sum of the deductions it names exactly; an approximate challan is refused rather than stored.
      operationId: recordTdsChallan
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RecordTdsChallanRequest'
      responses:
        '200':
          description: Challan recorded and the named deductions advanced to deposited.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RecordTdsChallanResponse'
        '400':
          description: Withholding is disabled, a named deduction is not accrued or does not share the challan's section, financial year, and quarter, or the challan total does not equal the sum of the deductions it names.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not Support.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: One or more of the named deductions was not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/tds/certificates:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support
        status: approved
        resource: support only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Issue a Form 16A withholding certificate
      description: Mints the quarterly certificate for a driver from deductions that are covered by a challan and reported in a filed return, and advances them to certified. A re-issue supersedes rather than overwrites, because the earlier certificate may already be in the deductee's return.
      operationId: issueTdsCertificate
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/IssueTdsCertificateRequest'
      responses:
        '200':
          description: Certificate issued and the generated Form 16A stored.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/IssueTdsCertificateResponse'
        '400':
          description: Withholding is disabled, or a deduction for the quarter is not covered by a challan and so may not be certified.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not Support.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: No deductions exist for the requested driver, financial year, and quarter.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/tds/register:
    get:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support; supplier (own network); vehicle (own certificates, any plan)
        status: approved
        resource: own network or own deductee row
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Retrieve the TDS withholding register
      description: Returns the withholding register for a financial year with its tie-out against the taxes_withheld control account, the count of drivers with no PAN on file, and the uncovered balance. A driver caller sees only their own rows, and PAN is never returned beyond its last four digits.
      operationId: getTdsRegister
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GetTdsRegisterRequest'
      responses:
        '200':
          description: Register returned with its totals and control-account tie-out.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GetTdsRegisterResponse'
        '400':
          description: Withholding is disabled for the requested financial year.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller asked for a driver or supplier outside the scope they may read.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: No deductions exist for the requested driver, financial year, and quarter.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/reports/finance:
    get:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: supplier, merchant (own data), support (any, recorded)
        status: approved
        resource: entitlement-gated; merchant own data only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Retrieve an entitlement-gated finance report
      description: Returns a finance report row set with its totals and an explicit basis, either transaction date or settlement date, so that two differing figures can be reconciled. Report types beyond the standard set require the caller's plan to carry the matching finance entitlement.
      operationId: getFinanceReport
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GetFinanceReportRequest'
      responses:
        '200':
          description: Report generated, possibly truncated by the caller's plan limits.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GetFinanceReportResponse'
        '400':
          description: Invalid date range or unsupported report type.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '402':
          description: Plan does not carry the entitlement this report requires; the required entitlement is named in the error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is unauthorized for this entity's financial data.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/reports/finance/exports:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: supplier, merchant, support
        status: approved
        resource: same as getFinanceReport plus export entitlement
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Export a finance report
      description: Queues a finance report export in an accounting-tool or filing format and returns a short-lived signed download URL once ready. Consumes one metered export against the caller's plan allowance.
      operationId: exportFinanceReport
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ExportFinanceReportRequest'
      responses:
        '200':
          description: Export queued or ready.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExportFinanceReportResponse'
        '402':
          description: Export entitlement absent, or the monthly export allowance is exhausted.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/reports/finance/schedules:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: supplier, merchant
        status: approved
        resource: own subscription
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Create or amend a scheduled finance report
      description: Schedules recurring delivery of a finance report to verified addresses on the subscriber's own account. Requires the scheduled-reports entitlement and counts against the plan's schedule allowance.
      operationId: scheduleFinanceReport
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ScheduleFinanceReportRequest'
      responses:
        '200':
          description: Schedule created or amended.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ScheduleFinanceReportResponse'
        '400':
          description: Recipient address is not verified on this account.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '402':
          description: Scheduled-reports entitlement absent, or the schedule allowance is exhausted.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/entitlements:
    get:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: approved supplier or merchant; support (any subscriber)
        status: approved
        resource: own subscription unless support
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Read the caller's effective finance entitlements
      description: Returns the entitlements, metered limits, and period-to-date usage in force for the caller, together with the subscription status driving them. Clients gate finance surfaces on this response rather than on plan names.
      operationId: getEntitlements
      requestBody:
        required: false
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GetEntitlementsRequest'
      responses:
        '200':
          description: Effective entitlements returned.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GetEntitlementsResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller may not read another subscriber's entitlements.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/subscriptions/{subscriptionId}/preview:
    get:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: supplier, merchant (own); support (any)
        status: approved
        resource: own subscription unless support
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Preview the cost and entitlement effect of a plan change
      description: Computes proration, the amount payable now, and the exact entitlements gained and lost for a proposed plan change, including a plain statement of what becomes unreadable after a downgrade. Makes no change of its own.
      operationId: previewPlanChange
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PreviewPlanChangeRequest'
      responses:
        '200':
          description: Preview computed.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PreviewPlanChangeResponse'
        '400':
          description: Target plan is not offered to the caller's role, or the tariff does not belong to the plan.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Subscription, plan, or tariff not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/subscriptions/{subscriptionId}/plan:
    patch:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: supplier, merchant (own)
        status: approved
        resource: own subscription
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Upgrade or downgrade a subscription plan
      description: Applies a plan change. Upgrades take effect once the prorated invoice is paid; downgrades are scheduled for the next renewal so that a paid-for period is never truncated. Loss of any entitlement must be acknowledged against a prior preview.
      operationId: changeSubscriptionPlan
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ChangeSubscriptionPlanRequest'
      responses:
        '200':
          description: Change applied or scheduled.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ChangeSubscriptionPlanResponse'
        '400':
          description: Entitlement loss not acknowledged, target plan not offered to this role, or the change is a no-op.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller does not own this subscription.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Subscription, plan, or tariff not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '409':
          description: A plan change is already pending on this subscription.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/reports/financial:
    get:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: supplier, support
        status: approved
        resource: own network unless support
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Retrieve financial reports
      description: Aggregates transactional statistics across various business entities to avoid heavy client-side scans.
      operationId: getFinancialReport
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GetFinancialReportRequest'
      responses:
        '200':
          description: Financial report successfully generated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GetFinancialReportResponse'
        '400':
          description: Invalid date range.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is unauthorized to access this entity's financial metrics.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Specified entity does not exist.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/handover-codes:resend:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: code owner (buyer|merchant|supplier), vehicle on the handover, supplier (owner), support
        status: approved
        resource: named on the target document
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Re-send a handover code to its owner
      description: Re-sends an existing handover code to the counterparty who is meant to hold it, over SMS or an automated voice call-out. The code is never rotated on resend and the destination is returned masked.
      operationId: resendHandoverCode
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ResendHandoverCodeRequest'
      responses:
        '200':
          description: Handover code successfully re-sent.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ResendHandoverCodeResponse'
        '400':
          description: Zero or more than one target supplied, unsupported channel, target is already delivered, cancelled, or settled, or three sends were already made in the trailing hour.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not a party to this handover.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Target document or code record not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/verification-code-batches:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: merchant (own; bulk_order_handover|credit_repayment), supplier (own; cash_settlement)
        status: approved
        resource: ownerId == caller
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Issue a batch of single-use offline codes
      description: Issues a merchant or supplier a batch of single-use codes that authorise handovers with no network. The plaintext codes are returned exactly once; the server retains only salted hashes.
      operationId: issueOfflineCodeBatch
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/IssueOfflineCodeBatchRequest'
      responses:
        '200':
          description: Code batch successfully issued. Any previously active batch for the same owner and purpose is revoked.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/IssueOfflineCodeBatchResponse'
        '400':
          description: count is not a positive integer at or below 50, purpose is unrecognized, or the caller status is not approved.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller's role does not match the requested purpose.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/verification-fallbacks:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: supplier (owner of the goods or cash), support
        status: approved
        resource: owns the movement
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Authorize a weak-proof verification fallback
      description: Grants a named driver a two-hour, single-target permission to close one specific handover with weak proof when the counterparty cannot produce a code.
      operationId: authorizeVerificationFallback
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AuthorizeVerificationFallbackRequest'
      responses:
        '200':
          description: Fallback authorization successfully granted.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthorizeVerificationFallbackResponse'
        '400':
          description: A live authorization already covers this target and grantee, the target is missing or ambiguous, reason is empty, or the grantee is not a party to the handover.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller does not own the referenced handover.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Target document or grantee profile not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/credit-repayments:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: vehicle (started gig serving this merchant)
        status: approved
        resource: driver on that gig
        officialClient: android-if-vehicle
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Open a merchant cash repayment to a driver
      description: Opens a merchant-to-driver cash repayment against outstanding credit and issues the merchant the code that will authorise it. No balance moves until confirmCreditRepayment succeeds.
      operationId: initiateCreditRepayment
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/InitiateCreditRepaymentRequest'
      responses:
        '200':
          description: Repayment challenge successfully opened.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InitiateCreditRepaymentResponse'
        '400':
          description: Gig is not started, the merchant has no outstanding credit, amount is not positive, amount exceeds the balance payable in cash, or the idempotency key was already used for a different merchant or amount.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not the driver on a started Gig serving this merchant.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Gig, merchant profile, or credit profile not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/credit-repayments/{transferId}:confirm:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: vehicle (named on the transfer)
        status: approved
        resource: named driver
        officialClient: android-if-vehicle
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Confirm a merchant cash repayment
      description: Closes a pending repayment against the merchant's code, relieving the credit line at collection, increasing the driver's cash custody, and notifying the supplier.
      operationId: confirmCreditRepayment
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ConfirmCreditRepaymentRequest'
      responses:
        '200':
          description: Repayment successfully verified and recorded.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ConfirmCreditRepaymentResponse'
        '400':
          description: Transfer is not pending, the 30-minute challenge window has closed, verification failed against the merchant's code, the fallback is unauthorized or expired, or the idempotency key was already used for a different transfer.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not the driver named on the transfer.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Transfer, credit profile, or code record not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/cash/custody:
    get:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: vehicle (own), merchant (own), supplier (network), support (any including platform)
        status: approved-or-custody
        resource: scope matches role
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Retrieve a cash custody position at the requested scope
      description: >-
        Returns the single authoritative cash-in-custody figure for whatever scope the caller
        is entitled to ask about. Driver and supplier calling about the same settlement receive
        the same number. The supplier and platform scopes return a per-holder rollup instead of
        a single ledger; platform scope is Support-only.
      operationId: getCashCustodySummary
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GetCashCustodySummaryRequest'
      responses:
        '200':
          description: Custody summary successfully generated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GetCashCustodySummaryResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is requesting another party's custody position.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Driver, Gig, or settlement not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/cash-settlements/{settlementId}:declare:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: vehicle (named driver)
        status: approved-or-custody
        resource: named driver
        officialClient: android-if-vehicle
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Declare the cash a driver is handing over
      description: Records the amount the driver states they are physically handing over, before the supplier counts it, so a shortfall is attributable rather than contested.
      operationId: declareCashHandover
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DeclareCashHandoverRequest'
      responses:
        '200':
          description: Handover successfully declared.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DeclareCashHandoverResponse'
        '400':
          description: Settlement is already settled or written off, declaredAmount is negative, varianceNote is missing on a declaration that does not match the expected amount, or the idempotency key was already used for a different settlement.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not the driver on this settlement.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Settlement not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/cash-settlements/{settlementId}:confirm:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: vehicle (named), supplier (owner), support
        status: approved-or-custody
        resource: named parties
        officialClient: android-if-vehicle
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Confirm a cash settlement against the supplier's code
      description: Records the counted amount against the supplier's code, sweeps the ledger entries out of the driver's custody, and resolves any variance. This is the two-sided event that discharges custody.
      operationId: confirmCashSettlement
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ConfirmCashSettlementRequest'
      responses:
        '200':
          description: Settlement successfully confirmed, or moved to disputed when the variance was escalated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ConfirmCashSettlementResponse'
        '400':
          description: Settlement is already confirmed, countedAmount is negative, varianceResolution or varianceNote is missing on a non-zero variance, a waiver was requested by a driver, verification failed against the supplier's code, the fallback is unauthorized or expired, the named ledger entries no longer sum to the expected amount, or the idempotency key was already used for a different settlement.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not the driver, the owning supplier, or Support.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Settlement, code record, or a named ledger entry not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/cash-discrepancies:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: buyer, vehicle, merchant, supplier, support — party to the movement
        status: approved-or-custody
        resource: caller was a party
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Raise a cash discrepancy claim
      description: Lets any party to a cash movement contest an amount, turning a verbal dispute into a tracked claim with an owner. A referenced settlement moves to disputed and custody does not discharge.
      operationId: raiseCashDiscrepancy
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RaiseCashDiscrepancyRequest'
      responses:
        '200':
          description: Discrepancy successfully raised.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RaiseCashDiscrepancyResponse'
        '400':
          description: An equivalent discrepancy is already open, amount is not positive, no entity was referenced, or description is empty.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller was not a party to the referenced movement.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Referenced settlement, transfer, or order not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/cash-discrepancies/{discrepancyId}:
    patch:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: supplier (owner, not escalate_to_support), support
        status: approved
        resource: owning supplier or support
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Resolve a cash discrepancy
      description: Closes a discrepancy with a named outcome and writes the balancing ledger entry. This is the only path by which a cash or credit balance is corrected, so a correction is always itself an audited transaction.
      operationId: resolveCashDiscrepancy
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ResolveCashDiscrepancyRequest'
      responses:
        '200':
          description: Discrepancy successfully resolved or written off.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ResolveCashDiscrepancyResponse'
        '400':
          description: Discrepancy is already resolved or written off, adjustedAmount is not positive or exceeds the claimed amount, resolutionNote is empty, the resolution is not valid for this discrepancy kind, or the balancing entry would not reconcile the affected settlement.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller does not own this discrepancy, or a Supplier attempted a Support-only resolution.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Discrepancy, driver earnings, or credit profile not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/config/countries/{countryId}:
    put:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support
        status: approved
        resource: support only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Create or update a Country
      description: Support creates or updates a Country, including ISO codes and the mobile prefix used for phone verification on logikchain.com.
      operationId: upsertCountry
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpsertCountryRequest'
      responses:
        '200':
          description: Country successfully created or updated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UpsertCountryResponse'
        '400':
          description: Invalid ISO codes, mobile prefix, or uniqueness conflict.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller lacks the Support role.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/config/states/{stateId}:
    put:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support
        status: approved
        resource: support only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Create or update a State
      description: Support creates or updates a State under an active Country.
      operationId: upsertState
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpsertStateRequest'
      responses:
        '200':
          description: State successfully created or updated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UpsertStateResponse'
        '400':
          description: Invalid request or state code already exists in the country.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller lacks the Support role.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Parent Country does not exist or is inactive.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/config/districts/{districtId}:
    put:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support
        status: approved
        resource: support only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Create or update a District
      description: Support creates or updates a District under an active State.
      operationId: upsertDistrict
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpsertDistrictRequest'
      responses:
        '200':
          description: District successfully created or updated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UpsertDistrictResponse'
        '400':
          description: Invalid parent linkage or duplicate district name in the state.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller lacks the Support role.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Parent Country or State is missing or inactive.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/config/village-requests:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: buyer, merchant, supplier
        status: approved
        resource: authenticated field user
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Request a missing Village
      description: Lets a Buyer, Merchant, or Supplier ask Support to add a village that is missing from the geographic catalog. Creates a VillageRequest for the Support queue.
      operationId: requestVillage
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RequestVillageRequest'
      responses:
        '200':
          description: Village request successfully submitted.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RequestVillageResponse'
        '400':
          description: Missing geography fields, malformed PIN code, or a duplicate pending request.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not an approved Buyer, Merchant, or Supplier.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/config/villages/{villageId}:
    put:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support
        status: approved
        resource: support only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Create or update a Village
      description: Support creates or updates a Village, including the mandatory coordinates that composeGig copies into Gig.villages for the driver app's on-device geofence. Optionally resolves a pending VillageRequest.
      operationId: upsertVillage
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpsertVillageRequest'
      responses:
        '200':
          description: Village successfully created or updated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UpsertVillageResponse'
        '400':
          description: Malformed PIN code, out-of-range coordinates, or duplicate LGD code.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller lacks the Support role.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Village, referenced Hub, or referenced VillageRequest does not exist.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/config/plans/{planId}:
    put:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support
        status: approved
        resource: support only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Create or update a Subscription Plan
      description: Support creates or updates a platform Subscription Plan, including features and operational limits.
      operationId: upsertSubscriptionPlan
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpsertSubscriptionPlanRequest'
      responses:
        '200':
          description: Subscription Plan successfully created or updated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UpsertSubscriptionPlanResponse'
        '400':
          description: Invalid plan payload or duplicate plan name for the target role.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller lacks the Support role.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/config/tariffs/{tariffId}:
    put:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support
        status: approved
        resource: support only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Create or update a Plan Tariff
      description: Support creates or updates a priced tariff belonging to a Subscription Plan.
      operationId: upsertPlanTariff
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpsertPlanTariffRequest'
      responses:
        '200':
          description: Plan Tariff successfully created or updated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UpsertPlanTariffResponse'
        '400':
          description: Invalid price, GST, dates, or billing cycle.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller lacks the Support role.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Plan or optional Country does not exist.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/config/offers/{offerId}:
    put:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support
        status: approved
        resource: support only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Create or update a Subscription Offer
      description: Support creates or updates an Offer, including eligibility criteria evaluated at redemption time.
      operationId: upsertSubscriptionOffer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpsertSubscriptionOfferRequest'
      responses:
        '200':
          description: Subscription Offer successfully created or updated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UpsertSubscriptionOfferResponse'
        '400':
          description: Invalid discount, dates, eligibility, or tariff/plan mismatch.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller lacks the Support role.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Plan, Tariff, or referenced Country does not exist.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/config/discount-codes/{codeId}:
    put:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support
        status: approved
        resource: support only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Create or update an Offer Discount Code
      description: Support issues or updates a unique discount code bound to a Subscription Offer.
      operationId: upsertOfferDiscountCode
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpsertOfferDiscountCodeRequest'
      responses:
        '200':
          description: Offer Discount Code successfully created or updated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UpsertOfferDiscountCodeResponse'
        '400':
          description: Malformed code or code already issued.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller lacks the Support role.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Offer does not exist.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/config/{collection}/{recordId}:deactivate:
    patch:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support
        status: approved
        resource: support only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Deactivate a configuration record
      description: Support soft-deactivates a geographic or subscription configuration record after referential-integrity checks.
      operationId: deactivateConfigurationRecord
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DeactivateConfigurationRecordRequest'
      responses:
        '200':
          description: Record successfully deactivated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DeactivateConfigurationRecordResponse'
        '400':
          description: Record is still referenced by active dependents.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller lacks the Support role.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Record does not exist.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/config/catalog:
    get:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: any approved user; includeInactive is support-only
        status: approved
        resource: active catalog for all; inactive support-only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: List geographic and subscription catalog
      description: Returns the Support-managed catalog used by onboarding pickers and the Config UI. Inactive records are Support-only.
      operationId: listConfigurationCatalog
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ListConfigurationCatalogRequest'
      responses:
        '200':
          description: Catalog successfully returned.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ListConfigurationCatalogResponse'
        '400':
          description: Unknown collection type requested.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Non-Support requested inactive records.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/subscriptions:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: support
        status: approved
        resource: support only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Assign a platform subscription
      description: Support assigns a Plan and Tariff to a Supplier or Merchant and optionally redeems an Offer Discount Code.
      operationId: assignSubscription
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AssignSubscriptionRequest'
      responses:
        '200':
          description: Subscription successfully assigned.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AssignSubscriptionResponse'
        '400':
          description: Invalid plan, tariff, eligibility, or discount code.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller lacks the Support role.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Subscriber, Plan, Tariff, or Discount Code not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/subscriptions:self:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: supplier, merchant
        status: approved
        resource: own UID as subscriber
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Self-subscribe to a platform plan
      description: Allows a Supplier or Merchant to subscribe to a published Plan and Tariff, optionally applying an eligible Offer Discount Code.
      operationId: subscribeToPlan
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SubscribeToPlanRequest'
      responses:
        '200':
          description: Subscription successfully created.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SubscribeToPlanResponse'
        '400':
          description: Invalid plan, tariff, eligibility, or discount code.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller is not an approved Supplier or Merchant.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Plan, Tariff, or Discount Code not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/subscriptions/{subscriptionId}:cancel:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: supplier (own), merchant (own), support
        status: approved
        resource: owner or support
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Cancel a platform subscription
      description: Cancels an active or past-due platform subscription while preserving paid-for access until the end of the current billing period.
      operationId: cancelSubscription
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CancelSubscriptionRequest'
      responses:
        '200':
          description: Subscription successfully cancelled.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CancelSubscriptionResponse'
        '400':
          description: Subscription is already cancelled or expired.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller does not own this subscription and is not Support.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Subscription not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /v1/devices:
    post:
      x-logikchain-security:
        auth: bearer
        appCheck: required
        roles: any approved user
        status: approved
        resource: own profile; revoke is DELETE of that token only
        officialClient: any
      security:
        - BearerAuth: []
          AppCheck: []
      summary: Register or revoke an FCM device token
      description: Registers or revokes a Firebase Cloud Messaging registration token so the background Service Worker can deliver push notifications to a signed-in device.
      operationId: registerDeviceToken
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RegisterDeviceTokenRequest'
      responses:
        '200':
          description: Device token successfully registered or revoked.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RegisterDeviceTokenResponse'
        '400':
          description: Empty token or unsupported platform.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthenticated. Missing or invalid Firebase Auth token.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '403':
          description: Permission denied. Caller status is not approved.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Caller profile does not exist.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: Firebase Auth ID token. Required on every client route. Not used on provider webhooks or the scheduler.
    AppCheck:
      type: apiKey
      in: header
      name: X-Firebase-AppCheck
      description: Firebase App Check token. Required on every client route. Omitted on provider webhooks and the scheduler.

  schemas:
    UserRole:
      type: string
      enum:
        - buyer
        - merchant
        - vehicle
        - supplier
        - support
      description: Strict user roles on the platform.

    UserStatus:
      type: string
      enum:
        - approved
        - unauthorized
      description: Approval status of a user profile.

    UserProfile:
      type: object
      required:
        - id
        - role
        - status
      properties:
        id:
          type: string
          description: Unique user ID (Firebase Auth UID).
        role:
          $ref: '#/components/schemas/UserRole'
        status:
          $ref: '#/components/schemas/UserStatus'
        name:
          type: string
          description: Full name of the user.
        phone:
          type: string
          description: Phone number including the Support-configured Country mobile prefix (India seed uses +91 and 10 digits).
        email:
          type: string
          format: email
          description: User's email address.
        createdAt:
          type: string
          format: date-time
          description: ISO 8601 timestamp of registration.
        address:
          type: string
          description: Physical address of the buyer.
        countryId:
          type: string
          description: Selected Country ID used for phone prefix validation.
        selectedMerchantId:
          type: string
          description: Selected local merchant ID for buyer order pickups.
        permissions:
          type: object
          properties:
            location:
              type: boolean
            sms:
              type: boolean
            audio:
              type: boolean
            camera:
              type: boolean
          description: Granted device permissions.
        villageId:
          type: string
          description: Associated village ID for merchants/buyers.
        supplierId:
          type: string
          description: Associated supplier ID for merchants/drivers.
        shopDetails:
          type: string
          description: Description or details of the merchant's shop.
        contactInfo:
          type: string
          description: Driver contact details.
        location:
          type: string
          description: Geographic coordinate fallback or text address.
        gstin:
          type: string
          description: Indian GSTIN (GST Registration Number) for Suppliers and Merchants.
          pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
        activeSubscriptionId:
          type: string
          description: Current PlatformSubscription ID for suppliers and merchants.
        panNumber:
          type: string
          description: PAN, held encrypted and returned masked. Its absence raises the TDS rate applied to payouts.
          pattern: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$'
        activeBeneficiaryId:
          type: string
          description: BeneficiaryAccount currently designated for payouts. Set only through registerPayoutBeneficiary.
        payoutMethod:
          type: object
          required:
            - maskedLabel
            - verificationStatus
          properties:
            type:
              type: string
              enum:
                - upi
                - bank
            maskedLabel:
              type: string
              description: Display-only echo, e.g. ravi****@okaxis or HDFC ****4821. Raw identifiers never leave the server.
            verificationStatus:
              $ref: '#/components/schemas/BeneficiaryVerificationStatus'
          description: Read-only projection of the active beneficiary. Writing it through updateUserProfile is rejected.
        vehicleNumber:
          type: string
          description: Driver vehicle registration number.
        vehicleType:
          type: string
          description: Driver vehicle class (e.g., Tempo, Mini truck).
        deviceTokens:
          type: array
          items:
            $ref: '#/components/schemas/DeviceToken'
          description: Registered FCM tokens for push delivery, capped at the five most recently updated.

    Hub:
      type: object
      required:
        - id
        - name
        - countryId
        - stateId
        - districtId
        - country
        - state
        - district
        - villages
      properties:
        id:
          type: string
          description: Unique hub identifier.
        name:
          type: string
          description: Name of the distribution hub.
        countryId:
          type: string
          description: Support-configured Country ID.
        stateId:
          type: string
          description: Support-configured State ID.
        districtId:
          type: string
          description: Support-configured District ID.
        country:
          type: string
          description: Denormalized Country name (e.g., India).
        state:
          type: string
          description: Denormalized State name.
        district:
          type: string
          description: Denormalized District name.
        villages:
          type: array
          items:
            $ref: '#/components/schemas/Village'
          description: List of villages mapped to this hub.

    Village:
      type: object
      required:
        - id
        - lgdCode
        - name
        - pincode
        - panchayat
        - mandal
        - district
        - state
        - location
      properties:
        id:
          type: string
          description: Standard UUID.
        lgdCode:
          type: string
          description: Permanent Indian Local Government Directory (LGD) Village Code.
        name:
          type: string
          description: Vernacular or localized village name.
        pincode:
          type: string
          pattern: '^[0-9]{6}$'
          description: Standard 6-digit India Post PIN code.
        panchayat:
          type: string
          description: Gram Panchayat administration group.
        mandal:
          type: string
          description: Sub-district administrative block (Taluka/Tehsil).
        district:
          type: string
          description: Revenue District.
        state:
          type: string
          description: Indian State.
        location:
          type: object
          required:
            - latitude
            - longitude
          properties:
            latitude:
              type: number
            longitude:
              type: number
          description: Geographic coordinates of the village.
        population:
          type: integer
          description: Population count.
        tier:
          type: string
          description: Village tier classification.
        description:
          type: string
          description: Dynamic description or notes.

    Product:
      type: object
      required:
        - id
        - supplierId
        - name
        - category
        - price
        - stock
        - unit
        - hsnCode
      properties:
        id:
          type: string
          description: Unique product identifier.
        supplierId:
          type: string
          description: Supplier ID owning this product.
        name:
          type: string
          description: Name of the product.
        category:
          type: string
          description: Category of the product.
        price:
          type: number
          description: Price in INR.
        stock:
          type: number
          description: Atomic inventory stock count.
        unit:
          type: string
          description: Unit of measure (e.g., "50kg bag", "packet").
        hsnCode:
          type: string
          description: Harmonized System of Nomenclature (HSN) code.
        imageUrl:
          type: string
          description: Cloud Storage URL of the product image shown in pamphlets and product detail.

    Route:
      type: object
      required:
        - id
        - supplierId
        - name
        - origin
        - destination
        - length
        - duration
        - villages
      properties:
        id:
          type: string
          description: Unique route identifier.
        supplierId:
          type: string
          description: Supplier ID owning this route.
        name:
          type: string
          description: Descriptive name of the route.
        origin:
          type: string
          description: Starting hub or location.
        destination:
          type: string
          description: Final destination village or hub.
        length:
          type: number
          description: Route length in kilometers.
        duration:
          type: number
          description: Expected travel duration in minutes.
        villages:
          type: array
          items:
            type: object
            required:
              - villageId
              - name
              - journeyTimeFromOrigin
              - location
            properties:
              villageId:
                type: string
                description: References Village.id.
              name:
                type: string
              journeyTimeFromOrigin:
                type: number
                description: Minutes from origin to this village.
              location:
                type: object
                required:
                  - latitude
                  - longitude
                properties:
                  latitude:
                    type: number
                  longitude:
                    type: number
                description: Geographic coordinates copied into Gig.villages for geofencing.
          description: Ordered list of villages on the route.

    Discount:
      type: object
      required:
        - code
        - supplierId
        - name
        - description
        - discountPercent
        - eligibleCategory
        - minOrderValue
        - maxOrderValue
      properties:
        code:
          type: string
          description: Unique promo or discount code.
        supplierId:
          type: string
          description: Supplier ID offering this discount.
        name:
          type: string
          description: Name of the discount scheme.
        description:
          type: string
          description: Description of eligibility and terms.
        discountPercent:
          type: number
          description: Percentage discount to apply (0-100).
        eligibleCategory:
          type: string
          description: '"All" or a specific product category.'
        minOrderValue:
          type: number
          description: Minimum order value in INR.
        maxOrderValue:
          type: number
          description: Maximum order value in INR.

    Pamphlet:
      type: object
      required:
        - id
        - supplierId
        - title
        - subtitle
        - promotedProducts
        - createdAt
      properties:
        id:
          type: string
          description: Unique pamphlet identifier.
        supplierId:
          type: string
          description: Supplier ID owning this pamphlet.
        title:
          type: string
          description: Primary promotional title.
        subtitle:
          type: string
          description: Secondary subtitle.
        promotedProducts:
          type: array
          items:
            type: object
            required:
              - productId
              - name
              - originalPrice
              - discountedPrice
              - currentStock
              - totalStock
              - unitOfMeasure
              - volumeAddedToCart
              - slogan
            properties:
              productId:
                type: string
              name:
                type: string
              originalPrice:
                type: number
              discountedPrice:
                type: number
              currentStock:
                type: number
              totalStock:
                type: number
              unitOfMeasure:
                type: string
              volumeAddedToCart:
                type: number
              slogan:
                type: string
          description: Curated list of discounted promotional products.
        createdAt:
          type: string
          format: date-time
          description: Creation timestamp.

    Gig:
      type: object
      required:
        - id
        - title
        - supplierId
        - supplierName
        - routeId
        - routeName
        - villages
        - villageIds
        - merchantIds
        - vehicleId
        - driverName
        - pamphletId
        - date
        - arrivingTimes
        - status
        - currentVillageIndex
        - currentVillageStatus
      properties:
        id:
          type: string
          description: Unique Gig identifier.
        title:
          type: string
          description: Descriptive title of the Gig.
        supplierId:
          type: string
          description: Supplier ID organizing the Gig.
        supplierName:
          type: string
          description: Name of the supplier.
        routeId:
          type: string
          description: Assigned Route ID.
        routeName:
          type: string
          description: Name of the route.
        villages:
          type: array
          items:
            type: object
            required:
              - villageId
              - name
              - location
            properties:
              villageId:
                type: string
                description: References Village.id.
              name:
                type: string
              location:
                type: object
                required:
                  - latitude
                  - longitude
                properties:
                  latitude:
                    type: number
                  longitude:
                    type: number
          description: Ordered copy of the Route villages; carries coordinates for the driver app's on-device Haversine geofence.
        villageIds:
          type: array
          items:
            type: string
          description: >-
            Denormalized villages[].villageId. composeGig writes this so BUY-04 /
            MER-02 can query villageIds array-contains the shopper's villageId.
        merchantIds:
          type: array
          items:
            type: string
          description: Merchants served by this Gig, in village order.
        vehicleId:
          type: string
          description: Driver's User ID.
        driverName:
          type: string
          description: Name of the driver.
        pamphletId:
          type: string
          description: Assigned Pamphlet ID.
        date:
          type: string
          description: Scheduled date of the Gig.
        arrivingTimes:
          type: object
          additionalProperties:
            type: string
          description: 'Map of village names to expected arrival times (e.g., {"Village A": "10:30 AM"}).'
        status:
          type: string
          enum:
            - created
            - started
            - completed
            - suspended
          description: Current operational status of the Gig.
        currentVillageIndex:
          type: integer
          description: -1 if not started, 0 to N-1, N if completed. Preserved across suspension so a reassigned driver resumes here.
        currentVillageStatus:
          type: string
          enum:
            - arriving
            - reached
            - left
            - none
          description: State of the vehicle relative to the current village.
        suspensionReason:
          type: string
          description: Populated when status is suspended.
        suspendedAt:
          type: string
          format: date-time
          description: Timestamp the Gig was suspended.

    OrderItem:
      type: object
      required:
        - productId
        - name
        - quantity
        - price
        - hsnCode
        - unit
      properties:
        productId:
          type: string
          description: Product identifier.
        name:
          type: string
          description: Name of the product.
        quantity:
          type: integer
          description: Quantity ordered.
        price:
          type: number
          description: Price per unit in INR.
        hsnCode:
          type: string
          description: Harmonized System of Nomenclature (HSN) code.
        unit:
          type: string
          description: Unit Quantity Code (UQC) copied from Product.unit.

    Order:
      type: object
      required:
        - id
        - gigId
        - buyer
        - village
        - merchantId
        - items
        - subTotal
        - gstRate
        - gstAmount
        - totalPrice
        - supplierGstNumber
        - currency
        - paymentStatus
        - deliveryStatus
        - createdAt
        - invoiceNumber
        - invoiceDate
        - cgstAmount
        - sgstAmount
        - igstAmount
        - supplierName
        - supplierAddress
        - recipientName
        - recipientAddress
        - recipientShippingAddress
        - placeOfSupply
        - authorizedSignatory
      properties:
        id:
          type: string
          description: Unique order identifier.
        gigId:
          type: string
          description: Associated Gig ID.
        buyer:
          type: string
          description: Buyer's User ID.
        village:
          type: string
          description: Delivery village name.
        merchantId:
          type: string
          description: Assigned local merchant ID for pickup.
        items:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
        discount:
          $ref: '#/components/schemas/Discount'
        subTotal:
          type: number
          description: Base order amount before GST in INR.
        gstRate:
          type: number
          description: Applied GST Rate percentage (e.g. 18 for 18%).
        gstAmount:
          type: number
          description: Calculated GST amount in INR.
        totalPrice:
          type: number
          description: Total price including GST in INR.
        supplierGstNumber:
          type: string
          description: GSTIN registration number of the managing supplier.
        currency:
          type: string
          enum:
            - INR
          default: INR
        paymentStatus:
          type: string
          enum:
            - paid
            - pending
            - refund_pending
            - refunded
        deliveryStatus:
          type: string
          enum:
            - placed
            - reached_merchant
            - delivered
            - cancelled
            - suspended
        pickupCodeIssuedAt:
          type: string
          description: When the pickup code was minted. The code itself is never on this document; it lives at /Orders/{orderId}/private/pickup, readable only by the buyer and Support, so a driver or merchant reading the order cannot read the code they are about to ask for.
        pickupCodeLastSentAt:
          type: string
          description: Last time the code was delivered by SMS or voice, used to rate-limit resendHandoverCode.
        deliveryProof:
          $ref: '#/components/schemas/DeliveryProof'
        refundId:
          type: string
          description: Razorpay refund identifier.
        refundedAmount:
          type: number
          description: Amount refunded in INR.
        refundedAt:
          type: string
          format: date-time
          description: Timestamp the refund was initiated.
        suspensionReason:
          type: string
          description: Populated when deliveryStatus is suspended.
        createdAt:
          type: string
          format: date-time
          description: ISO 8601 creation timestamp.
        invoiceNumber:
          type: string
          description: Consecutive unique serial number (max 16 chars).
        invoiceDate:
          type: string
          format: date-time
          description: Date of invoice issuance.
        cgstAmount:
          type: number
          description: Central GST Amount in INR (9%).
        sgstAmount:
          type: number
          description: State GST Amount in INR (9%).
        igstAmount:
          type: number
          description: Integrated GST Amount in INR (18%).
        supplierName:
          type: string
          description: Name of the supplier.
        supplierAddress:
          type: string
          description: Physical address of the supplier.
        recipientName:
          type: string
          description: Name of the recipient.
        recipientAddress:
          type: string
          description: Billing address of the recipient.
        recipientShippingAddress:
          type: string
          description: Shipping address of the recipient.
        recipientGstNumber:
          type: string
          description: GSTIN of the recipient (if registered).
        placeOfSupply:
          type: string
          description: Place of supply (e.g., Andhra Pradesh).
        authorizedSignatory:
          type: string
          description: Authorized signatory name or signature field text.

    MerchantOrder:
      type: object
      required:
        - id
        - gigId
        - merchantId
        - merchantName
        - supplierId
        - supplierName
        - items
        - subTotal
        - gstRate
        - gstAmount
        - totalPrice
        - supplierGstNumber
        - currency
        - paidWithCredit
        - status
        - createdAt
        - invoiceNumber
        - invoiceDate
        - cgstAmount
        - sgstAmount
        - igstAmount
        - supplierAddress
        - recipientName
        - recipientAddress
        - recipientShippingAddress
        - placeOfSupply
        - authorizedSignatory
      properties:
        id:
          type: string
          description: Unique merchant order identifier.
        merchantId:
          type: string
          description: Merchant ID placing the order.
        merchantName:
          type: string
          description: Name of the merchant.
        supplierId:
          type: string
          description: Supplier ID receiving the order.
        supplierName:
          type: string
          description: Name of the supplier.
        items:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
        subTotal:
          type: number
          description: Base order amount before GST in INR.
        gstRate:
          type: number
          description: Applied GST Rate percentage (e.g. 18 for 18%).
        gstAmount:
          type: number
          description: Calculated GST amount in INR.
        totalPrice:
          type: number
          description: Total order price including GST in INR.
        supplierGstNumber:
          type: string
          description: GSTIN registration number of the supplier.
        currency:
          type: string
          enum:
            - INR
          default: INR
        discount:
          $ref: '#/components/schemas/Discount'
        paidWithCredit:
          type: boolean
          description: True when placeMerchantOrder drew on the merchant's credit line.
        status:
          type: string
          enum:
            - placed
            - reached
            - delivered
            - cancelled
            - suspended
        deliveryProof:
          $ref: '#/components/schemas/DeliveryProof'
        suspensionReason:
          type: string
          description: Populated when status is suspended or when a cancellation reason was recorded.
        createdAt:
          type: string
          format: date-time
          description: ISO 8601 creation timestamp.
        invoiceNumber:
          type: string
          description: Consecutive unique serial number (max 16 chars).
        invoiceDate:
          type: string
          format: date-time
          description: Date of invoice issuance.
        cgstAmount:
          type: number
          description: Central GST Amount in INR (9%).
        sgstAmount:
          type: number
          description: State GST Amount in INR (9%).
        igstAmount:
          type: number
          description: Integrated GST Amount in INR (18%).
        supplierAddress:
          type: string
          description: Physical address of the supplier.
        recipientName:
          type: string
          description: Name of the recipient.
        recipientAddress:
          type: string
          description: Billing address of the recipient.
        recipientShippingAddress:
          type: string
          description: Shipping address of the recipient.
        recipientGstNumber:
          type: string
          description: GSTIN of the recipient (if registered).
        placeOfSupply:
          type: string
          description: Place of supply (e.g., Andhra Pradesh).
        authorizedSignatory:
          type: string
          description: Authorized signatory name or signature field text.

    CreditPaymentMade:
      type: object
      required:
        - id
        - amount
        - date
      properties:
        id:
          type: string
          description: Unique payment log identifier.
        amount:
          type: number
          description: Amount paid in INR.
        date:
          type: string
          format: date-time
          description: Timestamp of payment.

    CreditPaymentDue:
      type: object
      required:
        - id
        - amount
        - dueDate
        - status
      properties:
        id:
          type: string
          description: Unique due log identifier.
        amount:
          type: number
          description: Amount due in INR.
        dueDate:
          type: string
          format: date-time
          description: Due date timestamp.
        status:
          type: string
          enum:
            - pending
            - overdue
            - paid

    CreditProfile:
      type: object
      required:
        - merchantId
        - creditLimit
        - creditUsed
        - creditAvailable
        - paymentsMade
        - paymentsDue
      properties:
        merchantId:
          type: string
          description: Merchant User ID.
        creditLimit:
          type: number
          description: Total approved credit limit in INR.
        creditUsed:
          type: number
          description: Currently utilized credit in INR.
        creditAvailable:
          type: number
          description: Available credit in INR (Limit - Used).
        paymentsMade:
          type: array
          items:
            $ref: '#/components/schemas/CreditPaymentMade'
        paymentsDue:
          type: array
          items:
            $ref: '#/components/schemas/CreditPaymentDue'

    DriverPayment:
      type: object
      required:
        - id
        - amount
        - date
        - status
      properties:
        id:
          type: string
          description: Unique payment log identifier.
        amount:
          type: number
          description: Payout amount in INR.
        date:
          type: string
          format: date-time
          description: Payment timestamp.
        status:
          type: string
          enum:
            - completed
            - pending

    DriverPayoutRequest:
      type: object
      required:
        - id
        - amount
        - date
        - status
      properties:
        id:
          type: string
          description: Unique payout request identifier.
        amount:
          type: number
          description: Requested withdrawal amount in INR.
        date:
          type: string
          format: date-time
          description: Request timestamp.
        status:
          type: string
          enum:
            - pending
            - approved
            - rejected
        reviewedBy:
          type: string
          description: Supplier or Support UID that actioned the request.
        reviewedAt:
          type: string
          format: date-time
          description: Review timestamp.
        rejectionReason:
          type: string
          description: Reason supplied when the payout was rejected.

    DriverEarning:
      type: object
      required:
        - driverId
        - totalEarnings
        - pendingDues
        - payments
        - payoutRequests
      properties:
        driverId:
          type: string
          description: Driver User ID.
        totalEarnings:
          type: number
          description: Cumulative lifetime earnings in INR.
        pendingDues:
          type: number
          description: Outstanding withdrawable dues in INR.
        payments:
          type: array
          items:
            $ref: '#/components/schemas/DriverPayment'
        payoutRequests:
          type: array
          items:
            $ref: '#/components/schemas/DriverPayoutRequest'

    CreditIncreaseRequest:
      type: object
      required:
        - id
        - merchantId
        - requestedAmount
        - reason
        - status
        - createdAt
      properties:
        id:
          type: string
          description: Unique request identifier.
        merchantId:
          type: string
          description: Merchant User ID.
        requestedAmount:
          type: number
          description: Additional credit requested on top of the current creditLimit, in INR.
        reason:
          type: string
          description: Business justification for the increase.
        status:
          type: string
          enum:
            - pending_supplier_approval
            - approved
            - rejected
        createdAt:
          type: string
          format: date-time
          description: Request timestamp.
        reviewedBy:
          type: string
          description: Supplier or Support UID that actioned the request.
        reviewedAt:
          type: string
          format: date-time
          description: Review timestamp.
        approvedAmount:
          type: number
          description: Additional credit actually granted; may be less than requestedAmount.
        rejectionReason:
          type: string
          description: Reason supplied when the request was rejected.

    PaymentMode:
      type: string
      enum:
        - online
        - cash_on_pickup
      description: How a Buyer Order is paid for.

    MerchantOrderPaymentMode:
      type: string
      enum:
        - credit
        - online
        - cash_on_delivery
      description: How a bulk Merchant Order is paid for.

    PaymentIntentStatus:
      type: string
      enum:
        - created
        - pending
        - paid
        - failed
        - reversed
      description: Lifecycle of a server-priced gateway payment intent.

    VerificationMethod:
      type: string
      enum:
        - otp
        - offline_code
        - photo
        - gallery
        - counter_signature
        - support_override
        - code
      description: Verification vocabulary shared by every custody transfer. code is a deprecated alias for otp.

    VerificationStrength:
      type: string
      enum:
        - strong
        - weak
      description: Server-derived proof strength. strong for otp, code, and offline_code; weak for every fallback.

    CustodyTransferKind:
      type: string
      enum:
        - order_handover
        - bulk_order_handover
        - credit_repayment
        - cash_settlement
      description: The four hops at which goods or cash change hands on the platform.

    CustodyTransferStatus:
      type: string
      enum:
        - pending
        - verified
        - expired
        - disputed
        - reversed
      description: Lifecycle of a single custody transfer.

    CustodyPartyRole:
      type: string
      enum:
        - buyer
        - merchant
        - vehicle
        - supplier
        - support
      description: Role of a party on either side of a custody transfer or ledger entry.

    CashLedgerDirection:
      type: string
      enum:
        - collected
        - settled
        - adjustment
      description: Sign of a cash ledger entry; the amount itself is always positive.

    PaymentPurpose:
      type: string
      enum:
        - buyer_order
        - merchant_order
        - merchant_credit_repayment
        - subscription
      description: >-
        What a payment is for, which determines how the server derives its amount.
        merchant_order prepays one named bulk order and prices from that order's
        totalPrice; merchant_credit_repayment pays down an existing balance and prices
        from the credit profile.

    CashCustodyScope:
      type: string
      enum:
        - settlement
        - gig
        - driver
        - merchant
        - supplier
        - platform
      description: >-
        How wide a custody question is. Suppliers may reach supplier scope for their own
        network only; platform is Support-only.

    CashCustodyHolderSummary:
      type: object
      required:
        - holderId
        - holderName
        - holderRole
        - amountInCustody
        - weakProofAmount
        - openSettlementIds
        - openDiscrepancyCount
      properties:
        holderId:
          type: string
        holderName:
          type: string
        holderRole:
          $ref: '#/components/schemas/CustodyPartyRole'
        supplierId:
          type: string
        amountInCustody:
          type: number
          description: What this party is currently holding in INR.
        weakProofAmount:
          type: number
          description: How much of amountInCustody rests on a weak verification.
        openSettlementIds:
          type: array
          items:
            type: string
        oldestOpenSettlementAt:
          type: string
          format: date-time
        openDiscrepancyCount:
          type: integer
      description: One row of a wide-scope custody rollup: a party and what they are holding.

    CashLedgerSource:
      type: string
      enum:
        - buyer_cod
        - merchant_bulk_cash
        - merchant_credit_repayment
        - settlement
        - shortfall
        - overage
        - waiver
        - recovery
      description: Business event that produced a cash ledger entry.

    CashCustodyStatus:
      type: string
      enum:
        - in_custody
        - settled
        - disputed
        - written_off
        - reversed
      description: Standing of a cash ledger entry.

    CashSettlementStatus:
      type: string
      enum:
        - pending
        - declared
        - settled
        - disputed
        - written_off
      description: Lifecycle of the end-of-gig reconciliation between one driver and one supplier.

    CashVarianceKind:
      type: string
      enum:
        - none
        - shortfall
        - overage
      description: Direction of the gap between the counted amount and the expected amount.

    CashVarianceResolution:
      type: string
      enum:
        - recover_from_earnings
        - carry_forward
        - waive
        - escalate_to_support
      description: Named outcome applied to a variance or a discrepancy.

    CashDiscrepancyKind:
      type: string
      enum:
        - shortfall
        - overage
        - unrecorded_collection
        - disputed_amount
        - failed_verification
      description: Nature of a contested or unexplained cash amount.

    CashDiscrepancyStatus:
      type: string
      enum:
        - open
        - under_review
        - resolved
        - written_off
      description: Standing of a cash discrepancy claim.

    CreditTransactionType:
      type: string
      enum:
        - draw
        - release
        - repayment_cash
        - repayment_online
        - limit_change
        - adjustment
        - reversal
      description: Movement recorded on the append-only credit ledger behind every CreditProfile scalar.

    VerificationInput:
      type: object
      required:
        - method
        - capturedAt
      properties:
        method:
          $ref: '#/components/schemas/VerificationMethod'
        photoUrl:
          type: string
          description: Cloud Storage URL; required when method is photo or gallery.
        confirmationCode:
          type: string
          description: Required when method is otp, code, or offline_code; matched against the counterparty's private code record.
        codeBatchId:
          type: string
          description: VerificationCodeBatch ID; required when method is offline_code.
        codeCounter:
          type: integer
          description: Single-use index within the batch; required when method is offline_code.
        witnessName:
          type: string
          description: Required when method is counter_signature.
        witnessPhoneTail:
          type: string
          pattern: '^[0-9]{4}$'
          description: Last 4 digits of the counterparty's registered phone.
        fallbackAuthorizationId:
          type: string
          description: Required when method is support_override.
        fallbackReason:
          type: string
          description: Required for every weak method; shown verbatim in the audit log.
        capturedAt:
          type: string
          format: date-time
          description: Device clock at the physical moment of handover, preserved across an offline replay.

    VerificationRecord:
      type: object
      required:
        - method
        - strength
        - capturedAt
        - capturedBy
        - verifiedAt
      properties:
        method:
          $ref: '#/components/schemas/VerificationMethod'
        strength:
          $ref: '#/components/schemas/VerificationStrength'
        photoUrl:
          type: string
          description: Cloud Storage URL of the captured evidence.
        confirmationCode:
          type: string
          description: Stored masked as the last 2 digits; the full code is never echoed back.
        codeBatchId:
          type: string
        codeCounter:
          type: integer
        witnessName:
          type: string
        witnessPhoneTail:
          type: string
          pattern: '^[0-9]{4}$'
        fallbackAuthorizationId:
          type: string
        fallbackReason:
          type: string
        capturedAt:
          type: string
          format: date-time
          description: Device timestamp supplied by the client.
        capturedBy:
          type: string
          description: Server-set UID of the party that captured the evidence.
        verifiedAt:
          type: string
          format: date-time
          description: Server timestamp at which verification succeeded.

    CashLedgerEntry:
      type: object
      required:
        - id
        - direction
        - source
        - status
        - amount
        - currency
        - supplierId
        - holderId
        - holderRole
        - custodyTransferId
        - capturedAt
        - recordedAt
        - recordedBy
      properties:
        id:
          type: string
          description: Unique ledger entry identifier.
        direction:
          $ref: '#/components/schemas/CashLedgerDirection'
        source:
          $ref: '#/components/schemas/CashLedgerSource'
        status:
          $ref: '#/components/schemas/CashCustodyStatus'
        amount:
          type: number
          description: Always positive in INR; direction carries the sign.
        currency:
          type: string
          enum:
            - INR
          default: INR
        supplierId:
          type: string
          description: Owner of the money.
        holderId:
          type: string
          description: Party physically holding it, usually the driver.
        holderRole:
          $ref: '#/components/schemas/CustodyPartyRole'
        gigId:
          type: string
        orderId:
          type: string
        merchantOrderId:
          type: string
        merchantId:
          type: string
        buyerId:
          type: string
        custodyTransferId:
          type: string
          description: The verified handover that justifies this entry.
        settlementId:
          type: string
          description: Set when the entry is swept into a settlement.
        reversalOfEntryId:
          type: string
        reversedByEntryId:
          type: string
        capturedAt:
          type: string
          format: date-time
          description: Device timestamp of the physical event.
        recordedAt:
          type: string
          format: date-time
          description: Server timestamp.
        recordedBy:
          type: string
          description: UID that submitted the transfer.
        note:
          type: string

    CashSettlementLine:
      type: object
      required:
        - source
        - label
        - entryCount
        - amount
      properties:
        source:
          $ref: '#/components/schemas/CashLedgerSource'
        label:
          type: string
          description: Human-readable grouping, e.g. Buyer cash orders, Merchant credit repayments, Merchant bulk cash.
        entryCount:
          type: integer
          description: Number of ledger entries aggregated into this line.
        amount:
          type: number
          description: Aggregated amount in INR.

    DeliveryProofInput:
      allOf:
        - $ref: '#/components/schemas/VerificationInput'
      description: Retained alias for VerificationInput so existing order-delivery contracts keep their names.

    DeliveryProof:
      allOf:
        - $ref: '#/components/schemas/VerificationRecord'
      description: Retained alias for VerificationRecord so existing order-delivery contracts keep their names.

    DeviceToken:
      type: object
      required:
        - token
        - platform
        - updatedAt
      properties:
        token:
          type: string
          description: FCM registration token.
        platform:
          type: string
          enum:
            - web
            - android
            - ios
        updatedAt:
          type: string
          format: date-time
          description: Last registration refresh timestamp.

    NotificationCategory:
      type: string
      enum:
        - gig_arrival
        - gig_assignment
        - gig_suspension
        - order_status
        - credit
        - payout
        - subscription
        - support
        - cash_custody
        - verification
      description: Taxonomy used by the notification center and FCM payloads.

    Notification:
      type: object
      required:
        - id
        - userId
        - category
        - title
        - body
        - read
        - createdAt
      properties:
        id:
          type: string
          description: Unique notification identifier.
        userId:
          type: string
          description: Recipient UID.
        category:
          $ref: '#/components/schemas/NotificationCategory'
        title:
          type: string
        body:
          type: string
        deepLink:
          type: string
          description: In-app route the notification opens.
        relatedEntityId:
          type: string
          description: Gig, Order, MerchantOrder, or request ID.
        read:
          type: boolean
        createdAt:
          type: string
          format: date-time

    VillageRequest:
      type: object
      required:
        - id
        - requestedBy
        - requesterRole
        - name
        - pincode
        - district
        - state
        - status
        - createdAt
      properties:
        id:
          type: string
          description: Unique request identifier.
        requestedBy:
          type: string
          description: UID of the requesting Buyer, Merchant, or Supplier.
        requesterRole:
          $ref: '#/components/schemas/UserRole'
        name:
          type: string
        pincode:
          type: string
          pattern: '^[0-9]{6}$'
        panchayat:
          type: string
        mandal:
          type: string
        district:
          type: string
        state:
          type: string
        location:
          type: object
          required:
            - latitude
            - longitude
          properties:
            latitude:
              type: number
            longitude:
              type: number
        notes:
          type: string
        status:
          type: string
          enum:
            - pending_support_review
            - approved
            - rejected
        createdAt:
          type: string
          format: date-time
        reviewedBy:
          type: string
          description: Support UID that actioned the request.
        reviewedAt:
          type: string
          format: date-time
        createdVillageId:
          type: string
          description: Village ID created on approval.
        rejectionReason:
          type: string

    CreateSupplierRequest:
      type: object
      required:
        - email
        - name
        - phone
      properties:
        email:
          type: string
          format: email
          description: Supplier email.
        name:
          type: string
          description: Supplier full name.
        phone:
          type: string
          description: Supplier contact phone number validated against the selected Country mobile prefix.
        countryId:
          type: string
          description: Country ID used to validate the supplier phone prefix and length.
        location:
          type: string
          description: Supplier headquarters or business hub location description.

    CreateSupplierResponse:
      type: object
      required:
        - success
        - supplierId
      properties:
        success:
          type: boolean
          description: Indicates if the supplier creation succeeded.
        supplierId:
          type: string
          description: Newly provisioned Supplier user ID.

    ConvertBuyerToRoleRequest:
      type: object
      required:
        - buyerId
        - targetRole
      properties:
        buyerId:
          type: string
          description: Approved Buyer ID to upgrade.
        targetRole:
          type: string
          enum:
            - merchant
            - vehicle
          description: Target upgraded role.

    ConvertBuyerToRoleResponse:
      type: object
      required:
        - success
        - userId
        - newRole
        - officialClient
      properties:
        success:
          type: boolean
          description: Indicates if the role conversion succeeded.
        userId:
          type: string
          description: Upgraded user ID.
        newRole:
          type: string
          enum:
            - merchant
            - vehicle
          description: Upgraded user's new role.
        officialClient:
          type: string
          enum:
            - web
            - android
          description: Official runtime for the new role. android (vehicle) requires the PWA to hand off into the Play app. web (merchant) remains legal on the PWA.

    UpdateUserProfileRequest:
      type: object
      properties:
        userId:
          type: string
          description: Support-only target UID; defaults to the caller's own UID.
        name:
          type: string
        address:
          type: string
        contactInfo:
          type: string
        location:
          type: string
        villageId:
          type: string
        selectedMerchantId:
          type: string
        shopDetails:
          type: string
        gstin:
          type: string
          pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
        vehicleNumber:
          type: string
        vehicleType:
          type: string
        permissions:
          type: object
          properties:
            location:
              type: boolean
            sms:
              type: boolean
            audio:
              type: boolean
            camera:
              type: boolean

    UpdateUserProfileResponse:
      type: object
      required:
        - success
        - userId
        - updatedFields
      properties:
        success:
          type: boolean
          description: Indicates if the profile update succeeded.
        userId:
          type: string
          description: UID of the updated profile.
        updatedFields:
          type: array
          items:
            type: string
          description: Field names that passed the role allow-list and were written.

    DisassociateMerchantRequest:
      type: object
      required:
        - merchantId
        - reason
      properties:
        merchantId:
          type: string
          description: Merchant to remove from the Supplier network.
        reason:
          type: string
          description: Reason recorded on every suspended order.

    DisassociateMerchantResponse:
      type: object
      required:
        - success
        - suspendedOrderIds
        - suspendedMerchantOrderIds
      properties:
        success:
          type: boolean
          description: Indicates if the disassociation succeeded.
        suspendedOrderIds:
          type: array
          items:
            type: string
          description: Buyer Orders moved to suspended.
        suspendedMerchantOrderIds:
          type: array
          items:
            type: string
          description: Merchant Orders moved to suspended.

    ComposeGigRequest:
      type: object
      required:
        - title
        - routeId
        - vehicleId
        - pamphletId
        - merchantIds
        - date
        - arrivingTimes
      properties:
        title:
          type: string
          description: Descriptive title of the Gig.
        routeId:
          type: string
          description: Route ID to assign.
        vehicleId:
          type: string
          description: Driver's User ID to assign.
        pamphletId:
          type: string
          description: Pamphlet ID containing discounted products.
        merchantIds:
          type: array
          items:
            type: string
          description: Merchants served on this Gig; each must belong to the calling supplier and sit on the route.
        date:
          type: string
          description: Scheduled date of the Gig.
        arrivingTimes:
          type: object
          additionalProperties:
            type: string
          description: 'Map of village names to expected arrival times (e.g., {"Village A": "10:30 AM"}).'

    ComposeGigResponse:
      type: object
      required:
        - success
        - gigId
      properties:
        success:
          type: boolean
          description: Indicates if the Gig was created successfully.
        gigId:
          type: string
          description: The generated Gig ID.

    StartGigRequest:
      type: object
      required:
        - gigId
      properties:
        gigId:
          type: string
          description: Gig ID to start.

    StartGigResponse:
      type: object
      required:
        - success
        - startedAt
      properties:
        success:
          type: boolean
          description: Indicates if the Gig was started successfully.
        startedAt:
          type: string
          format: date-time
          description: ISO 8601 start timestamp.

    UpdateGigLocationRequest:
      type: object
      required:
        - gigId
        - currentVillageIndex
        - currentVillageStatus
      properties:
        gigId:
          type: string
          description: Active Gig ID.
        currentVillageIndex:
          type: integer
          description: Current village index in the route array.
        currentVillageStatus:
          type: string
          enum:
            - arriving
            - reached
            - left
          description: Status relative to the current village.

    UpdateGigLocationResponse:
      type: object
      required:
        - success
      properties:
        success:
          type: boolean
          description: Indicates if the location update succeeded.

    CompleteAndFinalizeGigRequest:
      type: object
      required:
        - gigId
      properties:
        gigId:
          type: string
          description: Gig ID to finalize.

    CompleteAndFinalizeGigResponse:
      type: object
      required:
        - success
        - totalEarnings
        - cashToHandOver
      properties:
        success:
          type: boolean
          description: Indicates if finalization succeeded.
        totalEarnings:
          type: number
          description: Total calculated driver earnings for this Gig in INR.
        settlementId:
          type: string
          description: CashSettlement opened for the cash swept from this Gig; absent on a cash-free gig.
        cashToHandOver:
          type: number
          description: Supplier cash the driver must hand over for this Gig in INR; 0 when no cash was collected.

    SuspendGigRequest:
      type: object
      required:
        - gigId
        - reason
      properties:
        gigId:
          type: string
          description: Gig ID to suspend.
        reason:
          type: string
          description: Operational reason (e.g., vehicle breakdown) recorded on the Gig and its orders.

    SuspendGigResponse:
      type: object
      required:
        - success
        - suspendedAt
        - suspendedOrderIds
      properties:
        success:
          type: boolean
          description: Indicates if the suspension succeeded.
        suspendedAt:
          type: string
          format: date-time
          description: ISO 8601 suspension timestamp.
        suspendedOrderIds:
          type: array
          items:
            type: string
          description: Orders moved to suspended by this call.

    ReassignGigDriverRequest:
      type: object
      required:
        - gigId
        - vehicleId
      properties:
        gigId:
          type: string
          description: Suspended Gig ID to reassign.
        vehicleId:
          type: string
          description: Replacement driver's User ID.

    ReassignGigDriverResponse:
      type: object
      required:
        - success
        - gigId
        - driverName
        - resumeVillageIndex
      properties:
        success:
          type: boolean
          description: Indicates if the reassignment succeeded.
        gigId:
          type: string
        driverName:
          type: string
          description: Name of the newly assigned driver.
        resumeVillageIndex:
          type: integer
          description: Last visited currentVillageIndex the new driver resumes from.

    PlaceOrderRequest:
      type: object
      required:
        - gigId
        - village
        - merchantId
        - items
        - paymentMode
      properties:
        gigId:
          type: string
          description: Associated Gig ID.
        village:
          type: string
          description: Village.id of the stop being shopped. Must equal the buyer's UserProfile.villageId and a Gig.villages[].villageId.
        merchantId:
          type: string
          description: Assigned local merchant ID for pickup.
        items:
          type: array
          items:
            type: object
            required:
              - productId
              - quantity
            properties:
              productId:
                type: string
              quantity:
                type: integer
          description: List of products and quantities to purchase.
        discountCode:
          type: string
          description: Optional discount code to apply.
        paymentMode:
          $ref: '#/components/schemas/PaymentMode'

    PlaceOrderResponse:
      type: object
      required:
        - success
        - orderId
        - subTotal
        - gstAmount
        - totalPrice
        - pickupCode
      properties:
        success:
          type: boolean
          description: Indicates if the order was placed.
        orderId:
          type: string
          description: The generated Order ID.
        subTotal:
          type: number
          description: Base order amount before GST in INR.
        gstAmount:
          type: number
          description: Calculated GST amount in INR.
        totalPrice:
          type: number
          description: Final calculated total price in INR (subTotal + gstAmount).
        pickupCode:
          type: string
          pattern: '^[0-9]{6}$'
          description: Returned once, to the placing buyer only, and never readable from the Order document.
        paymentIntentId:
          type: string
          description: Present when paymentMode is online.

    CancelOrderRequest:
      type: object
      required:
        - orderId
      properties:
        orderId:
          type: string
          description: Order ID to cancel.

    CancelOrderResponse:
      type: object
      required:
        - success
      properties:
        success:
          type: boolean
          description: Indicates if cancellation succeeded.

    MarkOrderDeliveredRequest:
      type: object
      required:
        - orderId
        - proof
        - idempotencyKey
      properties:
        orderId:
          type: string
          description: Order ID to close out.
        proof:
          $ref: '#/components/schemas/DeliveryProofInput'
        cashCollected:
          type: number
          description: Required when Order.paymentMode is cash_on_pickup; must equal Order.totalPrice.
        idempotencyKey:
          type: string
          description: Client-generated key, stable across offline replays of the same physical handover.

    MarkOrderDeliveredResponse:
      type: object
      required:
        - success
        - deliveredAt
        - custodyTransferId
        - cashInCustody
      properties:
        success:
          type: boolean
          description: Indicates if the order was marked delivered.
        deliveredAt:
          type: string
          format: date-time
          description: ISO 8601 delivery timestamp.
        custodyTransferId:
          type: string
          description: The verified CustodyTransfer recorded for this handover.
        cashLedgerEntryId:
          type: string
          description: Present when cash moved on this handover.
        cashInCustody:
          type: number
          description: The driver's running custody total in INR after this handover.

    PlaceMerchantOrderRequest:
      type: object
      required:
        - gigId
        - supplierId
        - items
        - paymentMode
        - payWithCredit
      properties:
        gigId:
          type: string
          description: Gig this bulk load rides on. Must serve the merchant's village and name the merchant.
        supplierId:
          type: string
          description: Supplier ID to purchase from. Must match the gig.
        items:
          type: array
          items:
            type: object
            required:
              - productId
              - quantity
            properties:
              productId:
                type: string
              quantity:
                type: integer
          description: List of products and bulk quantities.
        discountCode:
          type: string
          description: Optional discount code to apply.
        paymentMode:
          $ref: '#/components/schemas/MerchantOrderPaymentMode'
        payWithCredit:
          type: boolean
          description: Retained for compatibility; must equal paymentMode being credit.

    PlaceMerchantOrderResponse:
      type: object
      required:
        - success
        - merchantOrderId
        - subTotal
        - gstAmount
        - totalPrice
        - handoverCode
        - creditAvailable
      properties:
        success:
          type: boolean
          description: Indicates if the merchant order was placed.
        merchantOrderId:
          type: string
          description: The generated Merchant Order ID.
        subTotal:
          type: number
          description: Base order amount before GST in INR.
        gstAmount:
          type: number
          description: Calculated GST amount in INR.
        totalPrice:
          type: number
          description: Final calculated total price in INR (subTotal + gstAmount).
        handoverCode:
          type: string
          pattern: '^[0-9]{6}$'
          description: Returned once, to the placing merchant only, and never readable from the MerchantOrder document.
        creditTransactionId:
          type: string
          description: Present when paymentMode is credit.
        paymentIntentId:
          type: string
          description: Present when paymentMode is online.
        creditAvailable:
          type: number
          description: Merchant's remaining available credit in INR after this order.

    UpdateMerchantOrderStatusRequest:
      type: object
      required:
        - merchantOrderId
        - status
      properties:
        merchantOrderId:
          type: string
          description: Merchant Order ID to advance.
        status:
          type: string
          enum:
            - reached
            - delivered
          description: Target status. Transitions follow placed to reached to delivered.
        proof:
          allOf:
            - $ref: '#/components/schemas/DeliveryProofInput'
          description: Required when status is delivered. A recipient merchant confirming their own receipt cannot use the otp method; their confirmation is recorded as counter_signature.
        cashCollected:
          type: number
          description: Required when status is delivered and paymentMode is cash_on_delivery; must equal MerchantOrder.totalPrice.
        idempotencyKey:
          type: string
          description: Required when status is delivered; stable across offline replays of the same physical handover.

    UpdateMerchantOrderStatusResponse:
      type: object
      required:
        - success
        - status
        - updatedAt
      properties:
        success:
          type: boolean
          description: Indicates if the status update succeeded.
        status:
          type: string
          enum:
            - reached
            - delivered
        updatedAt:
          type: string
          format: date-time
          description: ISO 8601 transition timestamp.
        custodyTransferId:
          type: string
          description: The verified CustodyTransfer recorded on the delivered transition.
        cashLedgerEntryId:
          type: string
          description: Present when cash moved on this handover.
        cashInCustody:
          type: number
          description: The delivering driver's running custody total in INR after this handover.

    CancelMerchantOrderRequest:
      type: object
      required:
        - merchantOrderId
      properties:
        merchantOrderId:
          type: string
          description: Merchant Order ID to cancel.
        reason:
          type: string
          description: Optional cancellation reason recorded for audit.

    CancelMerchantOrderResponse:
      type: object
      required:
        - success
        - creditReleased
      properties:
        success:
          type: boolean
          description: Indicates if cancellation succeeded.
        creditReleased:
          type: number
          description: Credit returned to creditAvailable in INR; 0 for non-credit orders.

    RequestCreditIncreaseRequest:
      type: object
      required:
        - requestedAmount
        - reason
      properties:
        requestedAmount:
          type: number
          description: Additional credit requested on top of the current creditLimit, in INR.
        reason:
          type: string
          description: Business justification.

    RequestCreditIncreaseResponse:
      type: object
      required:
        - success
        - requestId
      properties:
        success:
          type: boolean
          description: Indicates if submission succeeded.
        requestId:
          type: string
          description: The generated credit increase request ID.

    SetMerchantCreditLimitRequest:
      type: object
      required:
        - merchantId
        - creditLimit
      properties:
        merchantId:
          type: string
          description: Merchant whose limit is being set.
        creditLimit:
          type: number
          description: Absolute new credit limit in INR, not a delta. Must be at least the merchant's current creditUsed.
        note:
          type: string
          description: Optional note surfaced to the merchant in the notification.

    SetMerchantCreditLimitResponse:
      type: object
      required:
        - success
        - creditLimit
        - creditAvailable
      properties:
        success:
          type: boolean
          description: Indicates if the limit was applied.
        creditLimit:
          type: number
          description: Resulting credit limit in INR.
        creditAvailable:
          type: number
          description: Recomputed available credit in INR (Limit - Used).

    ReviewCreditIncreaseRequestRequest:
      type: object
      required:
        - requestId
        - decision
      properties:
        requestId:
          type: string
          description: CreditIncreaseRequest ID to action.
        decision:
          type: string
          enum:
            - approve
            - reject
        approvedAmount:
          type: number
          description: Additional credit granted; defaults to requestedAmount and may not exceed it.
        rejectionReason:
          type: string
          description: Required when decision is reject.

    ReviewCreditIncreaseRequestResponse:
      type: object
      required:
        - success
        - status
        - creditLimit
        - creditAvailable
      properties:
        success:
          type: boolean
          description: Indicates if the review was recorded.
        status:
          type: string
          enum:
            - approved
            - rejected
        creditLimit:
          type: number
          description: Credit limit after the review in INR.
        creditAvailable:
          type: number
          description: Available credit after the review in INR.

    CreatePaymentIntentRequest:
      type: object
      required:
        - purpose
      properties:
        purpose:
          $ref: '#/components/schemas/PaymentPurpose'
        orderId:
          type: string
          description: Required when purpose is buyer_order.
        merchantOrderId:
          type: string
          description: Required when purpose is merchant_order.
        subscriptionId:
          type: string
          description: Required when purpose is subscription.
        amount:
          type: number
          description: Only honoured for merchant_credit_repayment, and clamped to the outstanding payable balance.
        duesTargeted:
          type: array
          items:
            type: string
          description: CreditPaymentDue IDs the repayment is allocated against; defaults to oldest-first.

    CreatePaymentIntentResponse:
      type: object
      required:
        - success
        - paymentIntentId
        - paymentTransactionId
        - gatewayOrderId
        - amount
        - currency
        - reused
      properties:
        success:
          type: boolean
          description: Indicates if the intent was created or an equivalent open intent was returned.
        paymentIntentId:
          type: string
          description: The PaymentIntent the client must confirm through processPayment.
        paymentTransactionId:
          type: string
          description: The platform-minted attempt record. This is the reference shown to the payer, not the gateway identifier.
        gatewayOrderId:
          type: string
          description: Razorpay order identifier the client presents to the checkout.
        amount:
          type: number
          description: Server-derived amount in INR the client must present to the gateway.
        currency:
          type: string
          enum:
            - INR
          default: INR
        reused:
          type: boolean
          description: True when an existing open intent was returned rather than a second one opened.

    PaymentTransactionStatus:
      type: string
      enum:
        - initiated
        - pending
        - succeeded
        - failed
        - partially_refunded
        - reversed
      description: Lifecycle of one collection attempt. Only succeeded means money was received.

    PayoutTransactionStatus:
      type: string
      enum:
        - approved
        - initiated
        - processing
        - completed
        - failed
        - reversed
        - cancelled
      description: Lifecycle of one disbursement. approved means authorised, not paid; only completed means the money left.

    PayoutRail:
      type: string
      enum:
        - upi
        - imps
        - neft
        - rtgs
        - manual_bank_transfer

    BeneficiaryVerificationStatus:
      type: string
      enum:
        - unverified
        - pending_verification
        - verified
        - failed
        - blocked

    BeneficiarySnapshot:
      type: object
      required:
        - beneficiaryId
        - type
        - maskedLabel
        - verificationStatus
        - fingerprint
        - snapshotAt
      properties:
        beneficiaryId:
          type: string
        type:
          type: string
          enum:
            - upi
            - bank
        maskedLabel:
          type: string
          description: The only destination representation any client ever receives.
        verificationStatus:
          $ref: '#/components/schemas/BeneficiaryVerificationStatus'
        verifiedName:
          type: string
          description: Account-holder name returned by the VPA lookup or penny drop.
        ifsc:
          type: string
        accountNumberLast4:
          type: string
        vpaHandle:
          type: string
        fingerprint:
          type: string
          description: Salted hash of the normalised destination; never reversible to an account number.
        snapshotAt:
          type: string
          format: date-time
      description: Destination frozen at payout request time. A later profile change cannot retarget an approved payout.

    ProcessPaymentRequest:
      type: object
      required:
        - paymentIntentId
        - paymentTransactionId
        - gatewayPaymentId
        - gatewaySignature
      properties:
        paymentIntentId:
          type: string
          description: The server-priced PaymentIntent being confirmed. Its stored amount is authoritative.
        paymentTransactionId:
          type: string
          description: The attempt being confirmed.
        gatewayPaymentId:
          type: string
          description: Razorpay payment identifier. Consumable exactly once across all PaymentTransactions.
        gatewaySignature:
          type: string
          description: HMAC over gatewayOrderId plus gatewayPaymentId; mandatory on both the Callable and the webhook path.

    ProcessPaymentResponse:
      type: object
      required:
        - success
        - transactionStatus
        - paymentTransactionId
        - paymentTransactionStatus
      properties:
        success:
          type: boolean
          description: The call completed. It does not mean the payment succeeded; read paymentTransactionStatus for that.
        transactionStatus:
          $ref: '#/components/schemas/PaymentIntentStatus'
        paymentTransactionId:
          type: string
        paymentTransactionStatus:
          $ref: '#/components/schemas/PaymentTransactionStatus'
        gatewayPaymentId:
          type: string
        creditTransactionId:
          type: string
          description: Present when the intent was a merchant credit repayment.
        creditUsed:
          type: number
          description: Merchant's credit drawn in INR after the repayment was applied.
        creditAvailable:
          type: number
          description: Merchant's remaining available credit in INR after the repayment was applied.
        activatedEntitlements:
          type: array
          items:
            type: string
          description: Present when the intent was a subscription; entitlements are granted only here.

    RefundOrderRequest:
      type: object
      required:
        - orderId
        - reasonCode
        - reason
        - idempotencyKey
      properties:
        orderId:
          type: string
          description: Cancelled or suspended paid Order to refund.
        amount:
          type: number
          description: Optional partial amount in INR; defaults to the unrefunded balance of Order.totalPrice.
        reasonCode:
          type: string
          enum:
            - order_cancelled
            - order_suspended
            - duplicate_payment
            - overcollection
            - support_goodwill
            - subscription_reversal
        reason:
          type: string
          description: Free-text reason recorded for audit and passed to the gateway.
        idempotencyKey:
          type: string
          description: A replay returns the original refund rather than issuing a second one.

    RefundOrderResponse:
      type: object
      required:
        - success
        - refundTransactionId
        - refundedAmount
        - cumulativeRefundedAmount
        - isPartial
        - requiresApproval
        - paymentStatus
      properties:
        success:
          type: boolean
          description: Indicates if the refund was accepted.
        refundTransactionId:
          type: string
          description: Platform refund record; the audit trail hangs off this, not the gateway id.
        refundId:
          type: string
          description: Razorpay refund identifier; absent until the provider accepts.
        refundedAmount:
          type: number
          description: Amount refunded in INR by this request.
        cumulativeRefundedAmount:
          type: number
          description: Total refunded against the original payment across all refunds.
        isPartial:
          type: boolean
        creditNoteId:
          type: string
          description: GST credit note raised against the original invoice.
        requiresApproval:
          type: boolean
          description: True when the amount is above the configured threshold and awaits a second Support approver.
        paymentStatus:
          type: string
          enum:
            - refund_pending
            - refunded
          description: refund_pending until the gateway webhook confirms settlement.

    RegisterPayoutBeneficiaryRequest:
      type: object
      required:
        - type
        - stepUpToken
        - idempotencyKey
      properties:
        type:
          type: string
          enum:
            - upi
            - bank
        vpa:
          type: string
          description: Required when type is upi.
        accountNumber:
          type: string
          description: Required when type is bank.
        accountNumberConfirm:
          type: string
          description: Must match accountNumber; a mistyped account number pays a stranger.
        ifsc:
          type: string
        accountHolderName:
          type: string
        accountType:
          type: string
          enum:
            - savings
            - current
        stepUpToken:
          type: string
          description: Proof of a fresh OTP re-authentication within the last five minutes.
        idempotencyKey:
          type: string

    RegisterPayoutBeneficiaryResponse:
      type: object
      required:
        - success
        - beneficiaryId
        - maskedLabel
        - verificationStatus
      properties:
        success:
          type: boolean
        beneficiaryId:
          type: string
        maskedLabel:
          type: string
        verificationStatus:
          $ref: '#/components/schemas/BeneficiaryVerificationStatus'
        verifiedName:
          type: string
        nameMatchScore:
          type: number
        coolingPeriodEndsAt:
          type: string
          format: date-time
          description: Payouts to this destination are held until this passes.
        supersededBeneficiaryId:
          type: string

    BlockPayoutBeneficiaryRequest:
      type: object
      required:
        - beneficiaryId
        - reason
      properties:
        beneficiaryId:
          type: string
        reason:
          type: string

    BlockPayoutBeneficiaryResponse:
      type: object
      required:
        - success
        - beneficiaryId
        - status
        - heldPayoutTransactionIds
      properties:
        success:
          type: boolean
        beneficiaryId:
          type: string
        status:
          type: string
          enum:
            - blocked
        heldPayoutTransactionIds:
          type: array
          items:
            type: string

    RequestPayoutRequest:
      type: object
      required:
        - amount
        - idempotencyKey
      properties:
        amount:
          type: number
          description: Payout withdrawal amount in INR, within withdrawable pendingDues.
        idempotencyKey:
          type: string

    RequestPayoutResponse:
      type: object
      required:
        - success
        - payoutRequestId
        - amount
        - destination
        - pendingDues
        - reservedForPayout
      properties:
        success:
          type: boolean
          description: Indicates if the payout request was filed.
        payoutRequestId:
          type: string
          description: The generated payout request ID.
        amount:
          type: number
        destination:
          $ref: '#/components/schemas/BeneficiarySnapshot'
        pendingDues:
          type: number
          description: Withdrawable balance after the reservation. The amount was reserved, not deleted.
        reservedForPayout:
          type: number
          description: Requested or in-flight balance not yet settled.
        beneficiaryCoolingUntil:
          type: string
          format: date-time
          description: Present when the destination changed recently; the request is reviewable but initiation waits.

    ReviewPayoutRequestRequest:
      type: object
      required:
        - driverId
        - payoutRequestId
        - decision
      properties:
        driverId:
          type: string
          description: Driver whose DriverEarnings document holds the request.
        payoutRequestId:
          type: string
          description: Payout request entry ID to action.
        decision:
          type: string
          enum:
            - approve
            - reject
        approvalNote:
          type: string
        rejectionReason:
          type: string
          description: Required when decision is reject.
        acknowledgedBeneficiaryLabel:
          type: string
          description: The masked destination the approver saw. A mismatch aborts the approval rather than applying it.

    ReviewPayoutRequestResponse:
      type: object
      required:
        - success
        - status
        - pendingDues
        - reservedForPayout
      properties:
        success:
          type: boolean
          description: Indicates if the review was recorded.
        status:
          type: string
          enum:
            - approved
            - rejected
          description: approved authorises a transfer. It is never a statement that money has moved.
        payoutTransactionId:
          type: string
          description: Present on approval. Its own status starts at approved and is advanced only by the rail.
        netAmount:
          type: number
          description: Gross less cash recovery and TDS; the figure that will actually leave.
        recoveryAmount:
          type: number
        tdsAmount:
          type: number
        pendingDues:
          type: number
          description: Driver's withdrawable dues in INR after the review; restored in full on rejection.
        reservedForPayout:
          type: number

    InitiatePayoutTransferRequest:
      type: object
      required:
        - payoutTransactionId
        - idempotencyKey
      properties:
        payoutTransactionId:
          type: string
        rail:
          $ref: '#/components/schemas/PayoutRail'
        idempotencyKey:
          type: string

    InitiatePayoutTransferResponse:
      type: object
      required:
        - success
        - payoutTransactionId
        - status
      properties:
        success:
          type: boolean
        payoutTransactionId:
          type: string
        status:
          $ref: '#/components/schemas/PayoutTransactionStatus'
        providerTransferId:
          type: string

    RecordPayoutSettlementRequest:
      type: object
      required:
        - payoutTransactionId
        - outcome
      properties:
        payoutTransactionId:
          type: string
        outcome:
          type: string
          enum:
            - success
            - failure
            - reversal
        utr:
          type: string
          description: Mandatory on success. A payout is never completed without one.
        providerTransferId:
          type: string
        providerEventId:
          type: string
        providerSignature:
          type: string
          description: Mandatory on the webhook path.
        failureCategory:
          type: string
          enum:
            - beneficiary_invalid
            - beneficiary_blocked
            - insufficient_float
            - rail_unavailable
            - provider_rejected
            - bank_returned
            - timeout
            - cancelled_by_approver
        failureReason:
          type: string
        reversalReference:
          type: string
        settledAt:
          type: string
          format: date-time

    RecordPayoutSettlementResponse:
      type: object
      required:
        - success
        - payoutTransactionId
        - status
      properties:
        success:
          type: boolean
        payoutTransactionId:
          type: string
        status:
          $ref: '#/components/schemas/PayoutTransactionStatus'
        utr:
          type: string
        duesRestored:
          type: number
          description: Non-zero when a failure or reversal released the reservation back to the driver.
        pendingDues:
          type: number
        exceptionId:
          type: string
          description: Present when the outcome could not be applied cleanly and a reconciliation break was opened.

    VerifyManualPayoutRequest:
      type: object
      required:
        - payoutTransactionId
        - utr
        - note
      properties:
        payoutTransactionId:
          type: string
        utr:
          type: string
          description: Re-entered independently by a second actor and required to match exactly.
        bankReference:
          type: string
        note:
          type: string

    VerifyManualPayoutResponse:
      type: object
      required:
        - success
        - payoutTransactionId
        - status
        - verifiedBy
        - verifiedAt
      properties:
        success:
          type: boolean
        payoutTransactionId:
          type: string
        status:
          type: string
          enum:
            - completed
        verifiedBy:
          type: string
        verifiedAt:
          type: string
          format: date-time

    RetryPayoutRequest:
      type: object
      required:
        - payoutTransactionId
        - reason
      properties:
        payoutTransactionId:
          type: string
        reason:
          type: string
        beneficiaryId:
          type: string
          description: Supplied only when the original destination caused the failure.

    RetryPayoutResponse:
      type: object
      required:
        - success
        - originalPayoutTransactionId
        - retryPayoutTransactionId
        - status
      properties:
        success:
          type: boolean
        originalPayoutTransactionId:
          type: string
        retryPayoutTransactionId:
          type: string
          description: A retry is a new transaction with its own provider reference, never a re-run of the old one.
        status:
          $ref: '#/components/schemas/PayoutTransactionStatus'

    GetFinancialReportRequest:
      type: object
      required:
        - level
        - id
        - startDate
        - endDate
      properties:
        level:
          type: string
          enum:
            - gig
            - route
            - merchant
            - village
          description: Entity level for aggregation.
        id:
          type: string
          description: Target entity ID.
        startDate:
          type: string
          format: date-time
          description: Start of reporting window (ISO 8601).
        endDate:
          type: string
          format: date-time
          description: End of reporting window (ISO 8601).

    GetFinancialReportResponse:
      type: object
      required:
        - revenue
        - ordersCount
        - averageOrderValue
        - topProducts
      properties:
        revenue:
          type: number
          description: Total aggregated revenue in INR.
        ordersCount:
          type: integer
          description: Total number of orders placed.
        averageOrderValue:
          type: number
          description: Average order value in INR.
        topProducts:
          type: array
          items:
            type: object
            required:
              - productId
              - name
              - quantity
            properties:
              productId:
                type: string
              name:
                type: string
              quantity:
                type: integer
          description: List of top selling products and quantities.

    GatewayWebhookRequest:
      type: object
      required:
        - provider
        - event
        - eventId
        - payload
        - signature
        - timestamp
      properties:
        provider:
          type: string
          enum:
            - razorpay
            - razorpayx
            - bank_sftp
        event:
          type: string
          description: Provider event name, e.g. payment.captured or payout.processed.
        eventId:
          type: string
          description: Provider event identifier. A repeat is acknowledged and discarded, never applied twice.
        payload:
          type: object
          additionalProperties: true
        signature:
          type: string
        timestamp:
          type: string
          format: date-time
          description: Rejected outside the configured replay window.

    GatewayWebhookResponse:
      type: object
      required:
        - success
        - handled
        - duplicate
      properties:
        success:
          type: boolean
        handled:
          type: boolean
          description: False when the event is recognised but not actionable in the current state.
        duplicate:
          type: boolean
        appliedTransition:
          type: string
          description: The state change made, e.g. payment_transaction.pending -> succeeded.
        targetRecordId:
          type: string
        exceptionId:
          type: string
          description: Present when the event contradicted platform state and a break was opened.

    RunReconciliationRequest:
      type: object
      required:
        - businessDate
        - scope
      properties:
        businessDate:
          type: string
          format: date
        scope:
          type: string
          enum:
            - collections
            - payouts
            - settlements
            - cash
            - all
        forceRerun:
          type: boolean
          description: Permitted only on an open accounting period.

    RunReconciliationResponse:
      type: object
      required:
        - success
        - reconciliationRunId
        - status
        - matchedCount
        - exceptionCount
      properties:
        success:
          type: boolean
        reconciliationRunId:
          type: string
        status:
          type: string
          enum:
            - running
            - completed
            - completed_with_exceptions
            - failed
        matchedCount:
          type: integer
        exceptionCount:
          type: integer
        unmatchedPlatformAmount:
          type: number
        unmatchedProviderAmount:
          type: number
        exceptionIds:
          type: array
          items:
            type: string

    ResolveReconciliationExceptionRequest:
      type: object
      required:
        - exceptionId
        - resolution
        - note
      properties:
        exceptionId:
          type: string
        resolution:
          type: string
          enum:
            - matched_manually
            - platform_corrected
            - provider_corrected
            - written_off
            - duplicate_ignored
            - escalated
        note:
          type: string
          description: Mandatory narrative. A break is never closed silently.
        adjustmentAmount:
          type: number
          description: Required for written_off; subject to the write-off approval threshold.
        linkedRecordId:
          type: string

    ResolveReconciliationExceptionResponse:
      type: object
      required:
        - success
        - exceptionId
        - status
      properties:
        success:
          type: boolean
        exceptionId:
          type: string
        status:
          type: string
          enum:
            - open
            - investigating
            - resolved
            - written_off
            - escalated
        requiresSecondApproval:
          type: boolean
        resolvedBy:
          type: string
        resolvedAt:
          type: string
          format: date-time

    CloseAccountingPeriodRequest:
      type: object
      required:
        - periodStart
        - periodEnd
        - attestation
      properties:
        periodStart:
          type: string
          format: date
        periodEnd:
          type: string
          format: date
        attestation:
          type: string
          description: Signed statement by the closer that reconciliation evidence was reviewed.

    CloseAccountingPeriodResponse:
      type: object
      required:
        - success
        - accountingPeriodId
        - status
      properties:
        success:
          type: boolean
        accountingPeriodId:
          type: string
        status:
          type: string
          enum:
            - open
            - closing
            - closed
        blockingExceptionIds:
          type: array
          items:
            type: string
          description: Populated when the close was refused because breaks remain open.
        closedBy:
          type: string
        closedAt:
          type: string
          format: date-time
        evidenceBundleUrl:
          type: string

    ReopenAccountingPeriodRequest:
      type: object
      required:
        - accountingPeriodId
        - reason
      properties:
        accountingPeriodId:
          type: string
        reason:
          type: string

    ReopenAccountingPeriodResponse:
      type: object
      required:
        - success
        - accountingPeriodId
        - status
        - reopenCount
      properties:
        success:
          type: boolean
        accountingPeriodId:
          type: string
        status:
          type: string
          enum:
            - reopened
        reopenCount:
          type: integer
          description: Every reopen is counted and reported; it is an exception, not a routine.
        reopenedBy:
          type: string

    IssueCreditNoteRequest:
      type: object
      required:
        - invoiceNumber
        - reasonCode
        - lines
      properties:
        invoiceNumber:
          type: string
        orderId:
          type: string
        merchantOrderId:
          type: string
        subscriptionInvoiceId:
          type: string
        reasonCode:
          type: string
          enum:
            - order_cancelled
            - goods_returned
            - price_correction
            - tax_correction
            - deficiency_in_service
        lines:
          type: array
          items:
            type: object
            required:
              - description
              - taxableValue
              - gstRate
            properties:
              description:
                type: string
              hsnCode:
                type: string
              quantity:
                type: number
              taxableValue:
                type: number
              gstRate:
                type: number
        refundTransactionId:
          type: string

    IssueCreditNoteResponse:
      type: object
      required:
        - success
        - creditNoteId
        - creditNoteNumber
        - taxableValue
        - totalCredit
      properties:
        success:
          type: boolean
        creditNoteId:
          type: string
        creditNoteNumber:
          type: string
          description: Drawn from a gapless per-financial-year series.
        taxableValue:
          type: number
        cgstAmount:
          type: number
        sgstAmount:
          type: number
        igstAmount:
          type: number
        totalCredit:
          type: number
        irn:
          type: string
          description: Present once e-invoicing acknowledges the note.

    SupplyType:
      type: string
      enum:
        - intra_state
        - inter_state
      description: Whether a supply is taxed as intra-state (CGST plus SGST) or inter-state (IGST).

    PlaceOfSupplyBasis:
      type: string
      enum:
        - recipient_registered_state
        - recipient_delivery_state
        - supplier_state
        - service_performance_state
      description: >-
        Which address decides the place of supply for a document class. It is
        configuration rather than a constant because the answer differs per supply.

    TdsSection:
      type: string
      enum:
        - '194C'
        - '194J'
        - none
      description: >-
        The section withholding runs under. Driver and contractor payouts sit under 194C;
        the applicable section is a tax-adviser decision recorded in configuration.

    TdsQuarter:
      type: string
      enum:
        - Q1
        - Q2
        - Q3
        - Q4
      description: Quarter of the Indian financial year that a deduction, challan, or certificate belongs to.

    TdsDeductionStatus:
      type: string
      enum:
        - accrued
        - deposited
        - returned
        - certified
        - reversed
      description: >-
        Lifecycle of one withholding event: withheld from a payout, covered by a challan,
        reported in a filed return, certified to the deductee, or undone by a payout reversal.

    UpsertTaxProfileRequest:
      type: object
      required:
        - supplierId
        - gstin
        - legalName
        - registeredStateCode
        - registrationType
        - placeOfSupplyBasis
        - defaultGstRate
        - invoiceNumberPrefix
        - creditNoteNumberPrefix
        - authorizedSignatory
        - effectiveFrom
      properties:
        id:
          type: string
          description: Omitted to create the first profile for the supplier; supplied to version an existing one.
        supplierId:
          type: string
          description: The supplying entity; one profile per GSTIN.
        gstin:
          type: string
          description: 15-character GSTIN. Its embedded state code must equal registeredStateCode.
        legalName:
          type: string
        tradeName:
          type: string
        registeredStateCode:
          type: string
          description: GST state code, e.g. 37. The matching State record must be active.
        registrationType:
          type: string
          enum:
            - regular
            - composition
            - unregistered
        placeOfSupplyBasis:
          type: object
          required:
            - buyerOrder
            - merchantOrder
            - subscription
          properties:
            buyerOrder:
              $ref: '#/components/schemas/PlaceOfSupplyBasis'
            merchantOrder:
              $ref: '#/components/schemas/PlaceOfSupplyBasis'
            subscription:
              $ref: '#/components/schemas/PlaceOfSupplyBasis'
          description: The basis used to resolve place of supply per document class.
        defaultGstRate:
          type: number
          description: Applied where a product carries no rate of its own; must be one of the configured permitted rates.
        reverseChargeSupported:
          type: boolean
          description: Declared rather than inferred; a profile that does not support the case refuses the document.
        exportSupplySupported:
          type: boolean
        invoiceNumberPrefix:
          type: string
          description: Prefix for the per-supplier, per-financial-year gapless invoice series.
        creditNoteNumberPrefix:
          type: string
          description: Prefix for the credit-note series, which is separate from the invoice series.
        authorizedSignatory:
          type: string
        effectiveFrom:
          type: string
          format: date-time
        effectiveTo:
          type: string
          format: date-time
        status:
          $ref: '#/components/schemas/ConfigRecordStatus'

    TaxResolutionPreviewEntry:
      type: object
      required:
        - documentClass
        - exampleRecipientStateCode
        - resolvedPlaceOfSupply
        - resolvedSupplyType
        - taxHeads
      properties:
        documentClass:
          type: string
          enum:
            - buyer_order
            - merchant_order
            - subscription
        exampleRecipientStateCode:
          type: string
          description: GST state code of the worked example recipient.
        resolvedPlaceOfSupply:
          type: string
        resolvedSupplyType:
          $ref: '#/components/schemas/SupplyType'
        taxHeads:
          type: array
          items:
            type: string
            enum:
              - CGST
              - SGST
              - IGST
          description: The heads the saved configuration will produce for this example.

    UpsertTaxProfileResponse:
      type: object
      required:
        - success
        - taxProfileId
        - resolutionPreview
      properties:
        success:
          type: boolean
        taxProfileId:
          type: string
        resolutionPreview:
          type: array
          items:
            $ref: '#/components/schemas/TaxResolutionPreviewEntry'
          description: >-
            A worked example per document class using the profile as saved, so the effect of
            a place-of-supply change is visible before the next invoice proves it.

    UpsertTdsConfigurationRequest:
      type: object
      required:
        - enabled
        - section
        - rateWithPan
        - rateWithoutPan
        - singlePaymentThreshold
        - annualThreshold
        - appliesRetrospectivelyOnThresholdBreach
        - requirePanBeforePayout
        - effectiveFrom
        - reason
      properties:
        enabled:
          type: boolean
          description: Withholding stays off until a tax adviser has confirmed the platform is the deductor.
        section:
          $ref: '#/components/schemas/TdsSection'
        deductorTan:
          type: string
          description: Required when enabled is true.
        rateWithPan:
          type: number
          description: Withholding percentage applied where a PAN is on file.
        rateWithoutPan:
          type: number
          description: The higher non-PAN percentage; must be greater than or equal to rateWithPan.
        singlePaymentThreshold:
          type: number
          description: Withhold when one payout exceeds this amount, in INR.
        annualThreshold:
          type: number
          description: Withhold on all payouts once the cumulative financial-year value exceeds this amount, in INR.
        appliesRetrospectivelyOnThresholdBreach:
          type: boolean
          description: Whether crossing the annual threshold applies retrospectively to earlier payouts in the same year.
        requirePanBeforePayout:
          type: boolean
        adviserConfirmedBy:
          type: string
          description: Required when enabled is true; names the qualified adviser who reviewed the configuration.
        adviserReference:
          type: string
          description: Required when enabled is true.
        effectiveFrom:
          type: string
          format: date-time
          description: Today or later. Back-dating would change deductions already communicated to a driver.
        reason:
          type: string
          description: Mandatory; a withholding change is never an unexplained edit.

    TdsConfigurationImpact:
      type: object
      required:
        - driversAboveAnnualThreshold
        - driversWithoutPan
        - estimatedMonthlyWithholding
      properties:
        driversAboveAnnualThreshold:
          type: integer
        driversWithoutPan:
          type: integer
          description: Each of these opens a Support task, because the non-PAN rate is the higher one.
        estimatedMonthlyWithholding:
          type: number
          description: Projected monthly withholding at the saved rates, in INR.

    UpsertTdsConfigurationResponse:
      type: object
      required:
        - success
        - configurationId
        - impact
      properties:
        success:
          type: boolean
        configurationId:
          type: string
          description: A new version; every TdsDeduction stores the version that decided it.
        impact:
          $ref: '#/components/schemas/TdsConfigurationImpact'

    RecordTdsChallanRequest:
      type: object
      required:
        - challanNumber
        - bsrCode
        - depositDate
        - financialYear
        - quarter
        - section
        - totalAmount
        - deductionIds
        - evidenceRef
      properties:
        challanNumber:
          type: string
          description: Bank challan identification number.
        bsrCode:
          type: string
        depositDate:
          type: string
          format: date
        financialYear:
          type: string
          description: Indian financial year, e.g. 2026-27.
        quarter:
          $ref: '#/components/schemas/TdsQuarter'
        section:
          $ref: '#/components/schemas/TdsSection'
        totalAmount:
          type: number
          description: Amount deposited in INR; must equal the sum of the named deductions exactly.
        deductionIds:
          type: array
          items:
            type: string
          description: Every id must be accrued and share this challan's section, financial year, and quarter.
        evidenceRef:
          type: string
          description: Cloud Storage pointer to the stamped challan.

    RecordTdsChallanResponse:
      type: object
      required:
        - success
        - challanId
        - coveredDeductionCount
        - uncoveredAmount
      properties:
        success:
          type: boolean
        challanId:
          type: string
        coveredDeductionCount:
          type: integer
        uncoveredAmount:
          type: number
          description: Accrued withholding still without a challan, in INR.

    IssueTdsCertificateRequest:
      type: object
      required:
        - driverId
        - financialYear
        - quarter
        - returnAcknowledgementNumber
      properties:
        driverId:
          type: string
        financialYear:
          type: string
        quarter:
          $ref: '#/components/schemas/TdsQuarter'
        returnAcknowledgementNumber:
          type: string
          description: Acknowledgement of the filed quarterly return; a certificate is never issued without it.
        supersedesCertificateId:
          type: string
          description: Supplied on a re-issue. The superseded certificate keeps its number and is marked revised.

    IssueTdsCertificateResponse:
      type: object
      required:
        - success
        - certificateId
        - certificateNumber
        - grossAmount
        - tdsAmount
        - documentRef
      properties:
        success:
          type: boolean
        certificateId:
          type: string
        certificateNumber:
          type: string
        grossAmount:
          type: number
          description: Gross payout value certified for the quarter, in INR.
        tdsAmount:
          type: number
          description: Tax withheld and certified for the quarter, in INR.
        documentRef:
          type: string
          description: Cloud Storage pointer to the generated Form 16A.

    GetTdsRegisterRequest:
      type: object
      required:
        - financialYear
      properties:
        financialYear:
          type: string
        quarter:
          $ref: '#/components/schemas/TdsQuarter'
        driverId:
          type: string
          description: A driver caller is pinned to their own ID and may not name another.
        status:
          $ref: '#/components/schemas/TdsDeductionStatus'

    TdsRegisterRow:
      type: object
      required:
        - deductionId
        - driverId
        - driverName
        - panProvided
        - grossAmount
        - tdsAmount
        - status
        - payoutTransactionId
        - deductedAt
      properties:
        deductionId:
          type: string
        driverId:
          type: string
        driverName:
          type: string
        panProvided:
          type: boolean
          description: Full PAN is never returned; the register reports only whether one is on file.
        grossAmount:
          type: number
          description: Gross payout value the deduction was taken from, in INR.
        tdsAmount:
          type: number
          description: Amount withheld, in INR. Negative on a reversal correction.
        status:
          $ref: '#/components/schemas/TdsDeductionStatus'
        challanNumber:
          type: string
          description: Present once a challan covers the deduction.
        certificateNumber:
          type: string
          description: Present once a Form 16A has been issued for the deduction.
        payoutTransactionId:
          type: string
        deductedAt:
          type: string
          format: date-time

    TdsRegisterTotals:
      type: object
      required:
        - grossAmount
        - tdsAmount
        - deposited
        - uncovered
      properties:
        grossAmount:
          type: number
          description: Total gross payout value in the register, in INR.
        tdsAmount:
          type: number
          description: Total withheld, in INR.
        deposited:
          type: number
          description: Total covered by a challan, in INR.
        uncovered:
          type: number
          description: Withholding still without a challan, in INR. This is somebody else's money.

    TdsRegisterTieOut:
      type: object
      required:
        - subLedger
        - controlBalance
        - registerTotal
        - balanced
      properties:
        subLedger:
          type: string
          enum:
            - taxes_withheld
        controlBalance:
          type: number
          description: Balance of the taxes_withheld control account, in INR.
        registerTotal:
          type: number
          description: Total the register itself reports, in INR.
        balanced:
          type: boolean
          description: False when the register and the control account disagree, which is a reportable break.

    GetTdsRegisterResponse:
      type: object
      required:
        - financialYear
        - configurationEnabled
        - rows
        - totals
        - driversMissingPan
        - tieOut
      properties:
        financialYear:
          type: string
        quarter:
          $ref: '#/components/schemas/TdsQuarter'
        configurationEnabled:
          type: boolean
          description: Whether withholding was enabled for the requested year.
        rows:
          type: array
          items:
            $ref: '#/components/schemas/TdsRegisterRow'
          description: A driver caller sees only their own rows.
        totals:
          $ref: '#/components/schemas/TdsRegisterTotals'
        driversMissingPan:
          type: integer
        tieOut:
          $ref: '#/components/schemas/TdsRegisterTieOut'

    ResendHandoverCodeRequest:
      type: object
      required:
        - channel
      properties:
        orderId:
          type: string
          description: Exactly one of orderId, merchantOrderId, or settlementId must be supplied.
        merchantOrderId:
          type: string
        settlementId:
          type: string
        channel:
          type: string
          enum:
            - sms
            - voice
          description: Delivery channel. voice places an automated call reading the digits twice, for recipients who cannot read an SMS.

    ResendHandoverCodeResponse:
      type: object
      required:
        - success
        - sentTo
        - sendCount
        - nextResendAvailableAt
      properties:
        success:
          type: boolean
          description: Indicates if the code was re-sent.
        sentTo:
          type: string
          description: Masked recipient phone, e.g. +91 ****3456. The caller never learns the full number.
        sendCount:
          type: integer
          description: Sends made against this code record, capped at three per trailing hour.
        nextResendAvailableAt:
          type: string
          format: date-time
          description: Earliest time at which another resend is permitted.

    IssueOfflineCodeBatchRequest:
      type: object
      required:
        - purpose
      properties:
        purpose:
          type: string
          enum:
            - bulk_order_handover
            - credit_repayment
            - cash_settlement
          description: >-
            Must match the caller's role; merchants authorise goods receipts and repayments,
            suppliers authorise settlements. order_handover is not issuable as a batch because
            a buyer's pickup code is minted per order.
        count:
          type: integer
          description: Number of codes to issue. Defaults to 20 and is capped at 50.

    IssueOfflineCodeBatchResponse:
      type: object
      required:
        - success
        - batchId
        - codes
        - expiresAt
      properties:
        success:
          type: boolean
          description: Indicates if the batch was issued.
        batchId:
          type: string
          description: The generated VerificationCodeBatch ID, submitted as codeBatchId on an offline_code proof.
        codes:
          type: array
          items:
            type: object
            required:
              - counter
              - code
            properties:
              counter:
                type: integer
              code:
                type: string
                pattern: '^[0-9]{6}$'
          description: Plaintext codes returned once, to the owner only. The server retains salted hashes alone.
        expiresAt:
          type: string
          format: date-time
          description: Batch expiry, 30 days from issue.

    AuthorizeVerificationFallbackRequest:
      type: object
      required:
        - transferKind
        - grantedTo
        - reason
      properties:
        transferKind:
          $ref: '#/components/schemas/CustodyTransferKind'
        orderId:
          type: string
          description: Exactly one target reference matching transferKind must be supplied.
        merchantOrderId:
          type: string
        settlementId:
          type: string
        grantedTo:
          type: string
          description: UID permitted to use the fallback, usually the driver executing the handover.
        reason:
          type: string
          description: Why the counterparty cannot produce a code; recorded verbatim on the authorization.

    AuthorizeVerificationFallbackResponse:
      type: object
      required:
        - success
        - authorizationId
        - expiresAt
      properties:
        success:
          type: boolean
          description: Indicates if the authorization was granted.
        authorizationId:
          type: string
          description: Submitted as fallbackAuthorizationId on a support_override proof.
        expiresAt:
          type: string
          format: date-time
          description: Authorization expiry, two hours from issue.

    InitiateCreditRepaymentRequest:
      type: object
      required:
        - merchantId
        - gigId
        - amount
        - idempotencyKey
      properties:
        merchantId:
          type: string
          description: The paying merchant, who must be served by the caller's started Gig.
        gigId:
          type: string
          description: Gig the driver is currently running.
        amount:
          type: number
          description: Cash the driver is collecting in INR; cannot exceed creditUsed less inTransitRepayments.
        duesTargeted:
          type: array
          items:
            type: string
          description: CreditPaymentDue IDs the repayment is allocated against; defaults to oldest-first.
        idempotencyKey:
          type: string
          description: Client-generated key; a replay returns the original transfer.

    InitiateCreditRepaymentResponse:
      type: object
      required:
        - success
        - custodyTransferId
        - amount
        - outstandingBefore
        - challengeExpiresAt
        - codeSentTo
      properties:
        success:
          type: boolean
          description: Indicates if the repayment challenge was opened.
        custodyTransferId:
          type: string
          description: The pending CustodyTransfer awaiting the merchant's code.
        amount:
          type: number
          description: Cash being collected in INR.
        outstandingBefore:
          type: number
          description: Merchant's credit drawn in INR before this repayment.
        challengeExpiresAt:
          type: string
          format: date-time
          description: The transfer expires unanswered 30 minutes after it is opened.
        codeSentTo:
          type: string
          description: Masked merchant phone the authorising code was sent to.

    ConfirmCreditRepaymentRequest:
      type: object
      required:
        - custodyTransferId
        - proof
        - idempotencyKey
      properties:
        custodyTransferId:
          type: string
          description: The pending transfer opened by initiateCreditRepayment.
        proof:
          allOf:
            - $ref: '#/components/schemas/VerificationInput'
          description: Verified against the merchant's code; the driver cannot attest to their own collection.
        idempotencyKey:
          type: string
          description: Client-generated key; a replay returns the original result.

    ConfirmCreditRepaymentResponse:
      type: object
      required:
        - success
        - creditTransactionId
        - cashLedgerEntryId
        - creditUsed
        - creditAvailable
        - inTransitRepayments
        - cashInCustody
      properties:
        success:
          type: boolean
          description: Indicates if the repayment was verified and recorded.
        creditTransactionId:
          type: string
          description: The repayment_cash entry appended to the credit ledger.
        cashLedgerEntryId:
          type: string
          description: The in_custody cash ledger entry opened against the driver.
        creditUsed:
          type: number
          description: Merchant's credit drawn in INR after the repayment; credit is relieved at collection.
        creditAvailable:
          type: number
          description: Merchant's remaining available credit in INR.
        inTransitRepayments:
          type: number
          description: Cash the merchant has paid that the supplier has not yet received, in INR.
        cashInCustody:
          type: number
          description: The driver's running custody total in INR.

    GetCashCustodySummaryRequest:
      type: object
      properties:
        scope:
          $ref: '#/components/schemas/CashCustodyScope'
        gigId:
          type: string
          description: Defaults to the caller's active or most recently completed Gig.
        driverId:
          type: string
          description: Supplier or Support callers only; a driver supplying another driver's UID is rejected.
        merchantId:
          type: string
          description: Supplier or Support callers only.
        supplierId:
          type: string
          description: >-
            Required for supplier scope. Supplier callers are pinned to their own ID and
            may not name another; only Support may omit it and ask for platform scope.
        settlementId:
          type: string
          description: Returns the figure frozen on this settlement rather than a live computation.
        agedOverHours:
          type: integer
          description: Restricts the wide scopes to settlements open longer than this.
        weakProofOnly:
          type: boolean
          description: Restricts to entries whose verification strength is weak.

    GetCashCustodySummaryResponse:
      type: object
      required:
        - scope
        - expectedAmount
        - weakProofAmount
        - breakdown
        - entries
        - openSettlementCount
        - openDiscrepancyCount
        - asOf
      properties:
        scope:
          $ref: '#/components/schemas/CashCustodyScope'
        gigId:
          type: string
        driverId:
          type: string
          description: Driver whose custody position this is; absent for supplier and platform scopes.
        driverName:
          type: string
        supplierId:
          type: string
          description: Owner of the money being held; absent for platform scope.
        expectedAmount:
          type: number
          description: The single authoritative cash-in-custody figure for the scope asked, in INR.
        weakProofAmount:
          type: number
          description: How much of expectedAmount rests on a weak verification.
        breakdown:
          type: array
          items:
            $ref: '#/components/schemas/CashSettlementLine'
          description: Itemised by source for narrow scopes; by holder role for wide ones.
        entries:
          type: array
          items:
            $ref: '#/components/schemas/CashLedgerEntry'
          description: The ledger entries behind the figure; empty for the wide scopes.
        holders:
          type: array
          items:
            $ref: '#/components/schemas/CashCustodyHolderSummary'
          description: Populated for supplier and platform scopes only.
        settlementId:
          type: string
          description: Present when a settlement has been opened for the scope.
        settlementStatus:
          $ref: '#/components/schemas/CashSettlementStatus'
        openSettlementCount:
          type: integer
        openDiscrepancyCount:
          type: integer
        oldestOpenSettlementAt:
          type: string
          format: date-time
        asOf:
          type: string
          format: date-time
          description: Server timestamp of the figure both parties are quoting.

    DeclareCashHandoverRequest:
      type: object
      required:
        - settlementId
        - declaredAmount
        - idempotencyKey
      properties:
        settlementId:
          type: string
          description: Settlement the caller is named on as driver.
        declaredAmount:
          type: number
          description: Cash in INR the driver states they are physically handing over.
        varianceNote:
          type: string
          description: Required when declaredAmount differs from expectedAmount.
        idempotencyKey:
          type: string
          description: Client-generated key; a replay returns the original result.

    DeclareCashHandoverResponse:
      type: object
      required:
        - success
        - settlementId
        - status
        - expectedAmount
        - declaredAmount
        - variance
        - challengeExpiresAt
      properties:
        success:
          type: boolean
          description: Indicates if the declaration was recorded.
        settlementId:
          type: string
        status:
          $ref: '#/components/schemas/CashSettlementStatus'
        expectedAmount:
          type: number
          description: Amount the ledger expects, in INR.
        declaredAmount:
          type: number
          description: Amount the driver declared, in INR.
        variance:
          type: number
          description: declaredAmount less expectedAmount, in INR.
        challengeExpiresAt:
          type: string
          format: date-time
          description: The declaration stands for 24 hours before it must be renewed.

    ConfirmCashSettlementRequest:
      type: object
      required:
        - settlementId
        - countedAmount
        - proof
        - idempotencyKey
      properties:
        settlementId:
          type: string
          description: Settlement being discharged.
        countedAmount:
          type: number
          description: Cash in INR the supplier counted on receipt.
        proof:
          allOf:
            - $ref: '#/components/schemas/VerificationInput'
          description: Verified against the supplier's code when the driver submits it; a supplier confirming directly is recorded as counter_signature.
        varianceResolution:
          allOf:
            - $ref: '#/components/schemas/CashVarianceResolution'
          description: Required when countedAmount differs from expectedAmount. waive is available to Supplier and Support callers only.
        varianceNote:
          type: string
          description: Required when countedAmount differs from expectedAmount.
        idempotencyKey:
          type: string
          description: Client-generated key, checked before any read of the ledger.

    ConfirmCashSettlementResponse:
      type: object
      required:
        - success
        - settlementId
        - status
        - expectedAmount
        - countedAmount
        - variance
        - varianceKind
        - cashInCustody
      properties:
        success:
          type: boolean
          description: Indicates if the settlement was confirmed.
        settlementId:
          type: string
        status:
          $ref: '#/components/schemas/CashSettlementStatus'
        expectedAmount:
          type: number
          description: Amount the ledger expected, in INR.
        countedAmount:
          type: number
          description: Amount the supplier counted, in INR.
        variance:
          type: number
          description: countedAmount less expectedAmount, in INR.
        varianceKind:
          $ref: '#/components/schemas/CashVarianceKind'
        discrepancyId:
          type: string
          description: Present when the variance was escalated to Support and custody stayed with the driver.
        cashInCustody:
          type: number
          description: The driver's remaining custody total in INR after the sweep.

    RaiseCashDiscrepancyRequest:
      type: object
      required:
        - kind
        - amount
        - againstPartyId
        - description
      properties:
        kind:
          $ref: '#/components/schemas/CashDiscrepancyKind'
        amount:
          type: number
          description: Contested amount in INR.
        againstPartyId:
          type: string
          description: The party the amount is claimed from or against.
        gigId:
          type: string
          description: At least one entity reference is required; a discrepancy with nothing attached is not actionable.
        settlementId:
          type: string
        custodyTransferId:
          type: string
        orderId:
          type: string
        merchantOrderId:
          type: string
        description:
          type: string
          description: What is being contested, recorded verbatim for the resolving party.
        evidenceUrls:
          type: array
          items:
            type: string
          description: Cloud Storage URLs of supporting evidence.

    RaiseCashDiscrepancyResponse:
      type: object
      required:
        - success
        - discrepancyId
        - status
      properties:
        success:
          type: boolean
          description: Indicates if the discrepancy was raised.
        discrepancyId:
          type: string
          description: The generated CashDiscrepancy ID.
        status:
          $ref: '#/components/schemas/CashDiscrepancyStatus'

    ResolveCashDiscrepancyRequest:
      type: object
      required:
        - discrepancyId
        - resolution
        - resolutionNote
      properties:
        discrepancyId:
          type: string
          description: Discrepancy to close.
        resolution:
          allOf:
            - $ref: '#/components/schemas/CashVarianceResolution'
          description: escalate_to_support is available to Support callers only.
        adjustedAmount:
          type: number
          description: Amount actually applied in INR; defaults to the claimed amount and may not exceed it.
        resolutionNote:
          type: string
          description: Why the discrepancy was closed this way, recorded on the balancing entry.

    ResolveCashDiscrepancyResponse:
      type: object
      required:
        - success
        - discrepancyId
        - status
      properties:
        success:
          type: boolean
          description: Indicates if the discrepancy was resolved.
        discrepancyId:
          type: string
        status:
          type: string
          enum:
            - resolved
            - written_off
        cashLedgerEntryId:
          type: string
          description: The adjustment entry that balances the ledger.
        creditTransactionId:
          type: string
          description: Present when the resolution touched a merchant's credit line.

    ConfigRecordStatus:
      type: string
      enum:
        - active
        - inactive
      description: Soft-activation status for Support-managed configuration records.

    BillingCycle:
      type: string
      enum:
        - monthly
        - quarterly
        - annual
      description: Subscription billing interval.

    PlanStatus:
      type: string
      enum:
        - draft
        - active
        - retired
      description: Publication status of a Subscription Plan.

    TariffType:
      type: string
      enum:
        - flat
        - per_user
        - per_gig
        - per_order
        - percentage
      description: How a Plan Tariff is priced.

    DiscountValueType:
      type: string
      enum:
        - percent
        - flat
      description: Offer discount calculation method.

    SubscriptionStatus:
      type: string
      enum:
        - active
        - past_due
        - cancelled
        - expired
      description: Lifecycle status of a PlatformSubscription.

    SubscriberRole:
      type: string
      enum:
        - supplier
        - merchant
      description: Roles that may hold a platform subscription.

    ConfigurationCollection:
      type: string
      enum:
        - countries
        - states
        - districts
        - subscriptionPlans
        - planTariffs
        - subscriptionOffers
        - offerDiscountCodes
      description: Named configuration collection for catalog queries and deactivation.

    Country:
      type: object
      required:
        - id
        - name
        - isoCode
        - isoCode3
        - numericCode
        - mobilePrefix
        - phoneNumberLength
        - currencyCode
        - currencySymbol
        - timezone
        - status
        - createdAt
        - updatedAt
        - createdBy
      properties:
        id:
          type: string
        name:
          type: string
        isoCode:
          type: string
          description: ISO 3166-1 alpha-2 code (e.g., IN).
        isoCode3:
          type: string
          description: ISO 3166-1 alpha-3 code (e.g., IND).
        numericCode:
          type: string
          description: ISO 3166-1 numeric code (e.g., 356).
        mobilePrefix:
          type: string
          description: International dialing prefix (e.g., +91).
          example: '+91'
        phoneNumberLength:
          type: integer
          description: National significant number length excluding the prefix.
        phoneValidationRegex:
          type: string
        currencyCode:
          type: string
          example: INR
        currencySymbol:
          type: string
          example: ₹
        timezone:
          type: string
          example: Asia/Kolkata
        status:
          $ref: '#/components/schemas/ConfigRecordStatus'
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
        createdBy:
          type: string

    State:
      type: object
      required:
        - id
        - countryId
        - name
        - code
        - status
        - createdAt
        - updatedAt
        - createdBy
      properties:
        id:
          type: string
        countryId:
          type: string
        name:
          type: string
        code:
          type: string
          description: Administrative code unique within the country (e.g., AP).
        status:
          $ref: '#/components/schemas/ConfigRecordStatus'
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
        createdBy:
          type: string

    District:
      type: object
      required:
        - id
        - countryId
        - stateId
        - name
        - status
        - createdAt
        - updatedAt
        - createdBy
      properties:
        id:
          type: string
        countryId:
          type: string
        stateId:
          type: string
        name:
          type: string
        code:
          type: string
        status:
          $ref: '#/components/schemas/ConfigRecordStatus'
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
        createdBy:
          type: string

    SubscriptionPlan:
      type: object
      required:
        - id
        - name
        - description
        - targetRole
        - status
        - features
        - createdAt
        - updatedAt
        - createdBy
      properties:
        id:
          type: string
        name:
          type: string
        description:
          type: string
        targetRole:
          $ref: '#/components/schemas/SubscriberRole'
        status:
          $ref: '#/components/schemas/PlanStatus'
        features:
          type: array
          items:
            type: string
        maxHubs:
          type: integer
        maxRoutes:
          type: integer
        maxGigsPerMonth:
          type: integer
        maxMerchants:
          type: integer
        maxDrivers:
          type: integer
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
        createdBy:
          type: string

    PlanTariff:
      type: object
      required:
        - id
        - planId
        - name
        - billingCycle
        - currencyCode
        - basePrice
        - tariffType
        - gstRate
        - status
        - effectiveFrom
        - createdAt
        - updatedAt
        - createdBy
      properties:
        id:
          type: string
        planId:
          type: string
        name:
          type: string
        billingCycle:
          $ref: '#/components/schemas/BillingCycle'
        currencyCode:
          type: string
        countryId:
          type: string
          description: Optional country-specific pricing override.
        basePrice:
          type: number
        tariffType:
          $ref: '#/components/schemas/TariffType'
        unitPrice:
          type: number
        gstRate:
          type: number
        status:
          $ref: '#/components/schemas/ConfigRecordStatus'
        effectiveFrom:
          type: string
          format: date-time
        effectiveTo:
          type: string
          format: date-time
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
        createdBy:
          type: string

    OfferEligibilityCriteria:
      type: object
      properties:
        eligibleRoles:
          type: array
          items:
            $ref: '#/components/schemas/SubscriberRole'
        eligibleCountryIds:
          type: array
          items:
            type: string
        eligiblePlanIds:
          type: array
          items:
            type: string
        newSubscribersOnly:
          type: boolean
        firstSubscriptionOnly:
          type: boolean
        minTenureMonths:
          type: integer
        minCompletedGigs:
          type: integer

    SubscriptionOffer:
      type: object
      required:
        - id
        - name
        - description
        - planId
        - discountType
        - discountValue
        - eligibility
        - redemptionCount
        - validFrom
        - validTo
        - status
        - createdAt
        - updatedAt
        - createdBy
      properties:
        id:
          type: string
        name:
          type: string
        description:
          type: string
        planId:
          type: string
        tariffId:
          type: string
        discountType:
          $ref: '#/components/schemas/DiscountValueType'
        discountValue:
          type: number
        eligibility:
          $ref: '#/components/schemas/OfferEligibilityCriteria'
        maxRedemptions:
          type: integer
        maxRedemptionsPerUser:
          type: integer
        redemptionCount:
          type: integer
        validFrom:
          type: string
          format: date-time
        validTo:
          type: string
          format: date-time
        status:
          $ref: '#/components/schemas/ConfigRecordStatus'
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
        createdBy:
          type: string

    OfferDiscountCode:
      type: object
      required:
        - id
        - offerId
        - code
        - usedCount
        - status
        - createdAt
        - updatedAt
        - createdBy
      properties:
        id:
          type: string
        offerId:
          type: string
        code:
          type: string
          description: Unique case-insensitive promo code.
        maxUses:
          type: integer
        usedCount:
          type: integer
        status:
          $ref: '#/components/schemas/ConfigRecordStatus'
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
        createdBy:
          type: string

    PlatformSubscription:
      type: object
      required:
        - id
        - subscriberId
        - subscriberRole
        - planId
        - tariffId
        - status
        - currencyCode
        - listPrice
        - discountAmount
        - billedAmount
        - gstAmount
        - startedAt
        - currentPeriodStart
        - currentPeriodEnd
        - createdAt
        - updatedAt
      properties:
        id:
          type: string
        subscriberId:
          type: string
        subscriberRole:
          $ref: '#/components/schemas/SubscriberRole'
        planId:
          type: string
        tariffId:
          type: string
        offerId:
          type: string
        discountCode:
          type: string
        status:
          $ref: '#/components/schemas/SubscriptionStatus'
        currencyCode:
          type: string
        listPrice:
          type: number
        discountAmount:
          type: number
        billedAmount:
          type: number
        gstAmount:
          type: number
        startedAt:
          type: string
          format: date-time
        currentPeriodStart:
          type: string
          format: date-time
        currentPeriodEnd:
          type: string
          format: date-time
        cancelledAt:
          type: string
          format: date-time
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    UpsertCountryRequest:
      type: object
      required:
        - name
        - isoCode
        - isoCode3
        - numericCode
        - mobilePrefix
        - phoneNumberLength
        - currencyCode
        - currencySymbol
        - timezone
      properties:
        id:
          type: string
        name:
          type: string
        isoCode:
          type: string
        isoCode3:
          type: string
        numericCode:
          type: string
        mobilePrefix:
          type: string
        phoneNumberLength:
          type: integer
        phoneValidationRegex:
          type: string
        currencyCode:
          type: string
        currencySymbol:
          type: string
        timezone:
          type: string
        status:
          $ref: '#/components/schemas/ConfigRecordStatus'

    UpsertCountryResponse:
      type: object
      required:
        - success
        - countryId
      properties:
        success:
          type: boolean
        countryId:
          type: string

    UpsertStateRequest:
      type: object
      required:
        - countryId
        - name
        - code
      properties:
        id:
          type: string
        countryId:
          type: string
        name:
          type: string
        code:
          type: string
        status:
          $ref: '#/components/schemas/ConfigRecordStatus'

    UpsertStateResponse:
      type: object
      required:
        - success
        - stateId
      properties:
        success:
          type: boolean
        stateId:
          type: string

    UpsertDistrictRequest:
      type: object
      required:
        - countryId
        - stateId
        - name
      properties:
        id:
          type: string
        countryId:
          type: string
        stateId:
          type: string
        name:
          type: string
        code:
          type: string
        status:
          $ref: '#/components/schemas/ConfigRecordStatus'

    UpsertDistrictResponse:
      type: object
      required:
        - success
        - districtId
      properties:
        success:
          type: boolean
        districtId:
          type: string

    RequestVillageRequest:
      type: object
      required:
        - name
        - pincode
        - district
        - state
      properties:
        name:
          type: string
        pincode:
          type: string
          pattern: '^[0-9]{6}$'
        panchayat:
          type: string
        mandal:
          type: string
        district:
          type: string
        state:
          type: string
        location:
          type: object
          required:
            - latitude
            - longitude
          properties:
            latitude:
              type: number
            longitude:
              type: number
          description: Optional coordinates captured from the requester's device.
        notes:
          type: string

    RequestVillageResponse:
      type: object
      required:
        - success
        - requestId
      properties:
        success:
          type: boolean
        requestId:
          type: string
          description: The generated VillageRequest ID for the Support queue.

    UpsertVillageRequest:
      type: object
      required:
        - lgdCode
        - name
        - pincode
        - panchayat
        - mandal
        - district
        - state
        - location
      properties:
        id:
          type: string
        lgdCode:
          type: string
          description: Permanent Indian Local Government Directory (LGD) Village Code; unique across Villages.
        name:
          type: string
        pincode:
          type: string
          pattern: '^[0-9]{6}$'
        panchayat:
          type: string
        mandal:
          type: string
        district:
          type: string
        state:
          type: string
        location:
          type: object
          required:
            - latitude
            - longitude
          properties:
            latitude:
              type: number
            longitude:
              type: number
          description: Mandatory coordinates; composeGig copies these into Gig.villages for the on-device geofence.
        population:
          type: integer
        tier:
          type: string
        description:
          type: string
        hubId:
          type: string
          description: Optional Hub to attach the village to.
        requestId:
          type: string
          description: VillageRequest resolved by this upsert.

    UpsertVillageResponse:
      type: object
      required:
        - success
        - villageId
      properties:
        success:
          type: boolean
        villageId:
          type: string

    UpsertSubscriptionPlanRequest:
      type: object
      required:
        - name
        - description
        - targetRole
        - features
      properties:
        id:
          type: string
        name:
          type: string
        description:
          type: string
        targetRole:
          $ref: '#/components/schemas/SubscriberRole'
        status:
          $ref: '#/components/schemas/PlanStatus'
        features:
          type: array
          items:
            type: string
          description: Marketing copy for the pricing card. It grants nothing; entitlements alone are enforced.
        entitlements:
          type: array
          items:
            $ref: '#/components/schemas/FinanceEntitlement'
          description: The enforced capability set. Baseline entitlements are always implied and cannot be withheld.
        entitlementLimits:
          $ref: '#/components/schemas/PlanEntitlementLimits'
        maxHubs:
          type: integer
        maxRoutes:
          type: integer
        maxGigsPerMonth:
          type: integer
        maxMerchants:
          type: integer
        maxDrivers:
          type: integer

    FinanceEntitlement:
      type: string
      enum:
        - finance.dashboard
        - finance.transaction_history
        - finance.statements
        - finance.settlement_register
        - finance.advanced_reports
        - finance.custom_date_range
        - finance.exports
        - finance.scheduled_reports
        - finance.reconciliation
        - finance.tax_reports
        - finance.period_close
      description: >-
        The enforced capability keys, identical to the FinanceEntitlement union in
        Logikchain_Data_Structures.md and never renamed once published.         finance.dashboard and
        finance.transaction_history are mandatory on every plan of either role.
        finance.reconciliation and finance.period_close are supplier-only. Baseline access to a party's own money and statutory documents is not
        expressed here at all — see BaselineFinanceCapability, which no plan can grant, remove
        or meter.

    BaselineFinanceCapability:
      type: string
      enum:
        - own_balances
        - own_transaction_status
        - own_receipts_and_invoices
        - own_statutory_evidence
        - own_subscription_billing
        - payout_self_service
        - dispute_raising
      description: >-
        Unconditional. Granted on every plan, in grace, after cancellation and after expiry, and
        absent from SubscriptionPlan.entitlements because it is not a plan's to give. Money
        already earned is not a feature that can be sold back to its owner.

    PlanEntitlementLimits:
      type: object
      properties:
        finance.report_history_days:
          type: integer
        finance.exports_per_month:
          type: integer
        finance.scheduled_reports:
          type: integer
        finance.reconciliation_rows_per_month:
          type: integer
        finance.retained_periods:
          type: integer
      description: >-
        Metered ceilings keyed by PlanEntitlementLimitKey. -1 means unlimited; an omitted key
        means the plan sets no ceiling. Consumption is counted in FinanceEntitlementUsage and
        returned by getEntitlements, so a limit is never discovered only at the point of refusal.

    UpsertSubscriptionPlanResponse:
      type: object
      required:
        - success
        - planId
      properties:
        success:
          type: boolean
        planId:
          type: string
        entitlements:
          type: array
          items:
            $ref: '#/components/schemas/FinanceEntitlement'
        entitlementsRemoved:
          type: array
          items:
            $ref: '#/components/schemas/FinanceEntitlement'
          description: Removals take effect at each subscriber's next renewal, never mid-cycle.
        affectedSubscriberCount:
          type: integer

    UpsertPlanTariffRequest:
      type: object
      required:
        - planId
        - name
        - billingCycle
        - currencyCode
        - basePrice
        - tariffType
        - gstRate
        - effectiveFrom
      properties:
        id:
          type: string
        planId:
          type: string
        name:
          type: string
        billingCycle:
          $ref: '#/components/schemas/BillingCycle'
        currencyCode:
          type: string
        countryId:
          type: string
        basePrice:
          type: number
        tariffType:
          $ref: '#/components/schemas/TariffType'
        unitPrice:
          type: number
        gstRate:
          type: number
        status:
          $ref: '#/components/schemas/ConfigRecordStatus'
        effectiveFrom:
          type: string
          format: date-time
        effectiveTo:
          type: string
          format: date-time

    UpsertPlanTariffResponse:
      type: object
      required:
        - success
        - tariffId
      properties:
        success:
          type: boolean
        tariffId:
          type: string

    UpsertSubscriptionOfferRequest:
      type: object
      required:
        - name
        - description
        - planId
        - discountType
        - discountValue
        - eligibility
        - validFrom
        - validTo
      properties:
        id:
          type: string
        name:
          type: string
        description:
          type: string
        planId:
          type: string
        tariffId:
          type: string
        discountType:
          $ref: '#/components/schemas/DiscountValueType'
        discountValue:
          type: number
        eligibility:
          $ref: '#/components/schemas/OfferEligibilityCriteria'
        maxRedemptions:
          type: integer
        maxRedemptionsPerUser:
          type: integer
        validFrom:
          type: string
          format: date-time
        validTo:
          type: string
          format: date-time
        status:
          $ref: '#/components/schemas/ConfigRecordStatus'

    UpsertSubscriptionOfferResponse:
      type: object
      required:
        - success
        - offerId
      properties:
        success:
          type: boolean
        offerId:
          type: string

    UpsertOfferDiscountCodeRequest:
      type: object
      required:
        - offerId
        - code
      properties:
        id:
          type: string
        offerId:
          type: string
        code:
          type: string
        maxUses:
          type: integer
        status:
          $ref: '#/components/schemas/ConfigRecordStatus'

    UpsertOfferDiscountCodeResponse:
      type: object
      required:
        - success
        - discountCodeId
      properties:
        success:
          type: boolean
        discountCodeId:
          type: string

    DeactivateConfigurationRecordRequest:
      type: object
      required:
        - collection
        - id
      properties:
        collection:
          $ref: '#/components/schemas/ConfigurationCollection'
        id:
          type: string

    DeactivateConfigurationRecordResponse:
      type: object
      required:
        - success
      properties:
        success:
          type: boolean

    ListConfigurationCatalogRequest:
      type: object
      properties:
        includeInactive:
          type: boolean
          description: Support-only flag to include inactive or retired records.
        types:
          type: array
          items:
            $ref: '#/components/schemas/ConfigurationCollection'
        countryId:
          type: string
        stateId:
          type: string
        planId:
          type: string
        offerId:
          type: string

    ListConfigurationCatalogResponse:
      type: object
      required:
        - countries
        - states
        - districts
        - subscriptionPlans
        - planTariffs
        - subscriptionOffers
        - offerDiscountCodes
      properties:
        countries:
          type: array
          items:
            $ref: '#/components/schemas/Country'
        states:
          type: array
          items:
            $ref: '#/components/schemas/State'
        districts:
          type: array
          items:
            $ref: '#/components/schemas/District'
        subscriptionPlans:
          type: array
          items:
            $ref: '#/components/schemas/SubscriptionPlan'
        planTariffs:
          type: array
          items:
            $ref: '#/components/schemas/PlanTariff'
        subscriptionOffers:
          type: array
          items:
            $ref: '#/components/schemas/SubscriptionOffer'
        offerDiscountCodes:
          type: array
          items:
            $ref: '#/components/schemas/OfferDiscountCode'

    AssignSubscriptionRequest:
      type: object
      required:
        - subscriberId
        - planId
        - tariffId
        - reason
      properties:
        subscriberId:
          type: string
        planId:
          type: string
        tariffId:
          type: string
        discountCode:
          type: string
        reason:
          type: string
          description: Justification for an administrative assignment; written to the audit log against the acting admin.

    AssignSubscriptionResponse:
      type: object
      required:
        - success
        - subscriptionId
        - subscriptionInvoiceId
        - billedAmount
        - gstAmount
        - status
      properties:
        success:
          type: boolean
        subscriptionId:
          type: string
        subscriptionInvoiceId:
          type: string
        billedAmount:
          type: number
          description: Taxable value in INR before GST.
        gstAmount:
          type: number
        status:
          type: string
          enum:
            - past_due
            - active
          description: past_due until the invoice is paid. An assignment does not by itself grant paid entitlements.
        paymentIntentId:
          type: string
        activeEntitlements:
          type: array
          items:
            $ref: '#/components/schemas/FinanceEntitlement'

    SubscribeToPlanRequest:
      type: object
      required:
        - planId
        - tariffId
        - idempotencyKey
      properties:
        planId:
          type: string
        tariffId:
          type: string
        discountCode:
          type: string
        idempotencyKey:
          type: string

    SubscribeToPlanResponse:
      type: object
      required:
        - success
        - subscriptionId
        - subscriptionInvoiceId
        - billedAmount
        - gstAmount
        - amountPayableNow
        - status
        - currentPeriodEnd
      properties:
        success:
          type: boolean
        subscriptionId:
          type: string
        subscriptionInvoiceId:
          type: string
        billedAmount:
          type: number
        gstAmount:
          type: number
        amountPayableNow:
          type: number
          description: Amount the payer must settle through the returned intent before entitlements activate.
        status:
          type: string
          enum:
            - past_due
            - active
        paymentIntentId:
          type: string
        currentPeriodEnd:
          type: string
          format: date-time

    GetEntitlementsRequest:
      type: object
      properties:
        subscriberId:
          type: string
          description: Admin and Support only. Everyone else reads their own.

    GetEntitlementsResponse:
      type: object
      required:
        - success
        - planId
        - planName
        - subscriptionStatus
        - entitlements
      properties:
        success:
          type: boolean
        planId:
          type: string
        planName:
          type: string
        subscriptionStatus:
          $ref: '#/components/schemas/SubscriptionStatus'
        inGracePeriod:
          type: boolean
          description: >-
            Derived from gracePeriodEndsAt, not a stored status. Grace is a window inside
            past_due during which entitlements survive, so it is reported alongside the status
            rather than replacing it.
        entitlements:
          type: array
          items:
            $ref: '#/components/schemas/FinanceEntitlement'
          description: Currently granted keys, resolved from the paid period and frozen for it.
        entitlementPositions:
          type: array
          description: >-
            Every known FinanceEntitlement, granted or not, each with the cheapest eligible plan
            for the caller's role that grants it. A screen can then render a locked tool with a
            real price instead of hiding a capability the user would pay for.
          items:
            type: object
            required:
              - entitlement
              - granted
            properties:
              entitlement:
                $ref: '#/components/schemas/FinanceEntitlement'
              granted:
                type: boolean
              requiredPlanId:
                type: string
              requiredPlanName:
                type: string
              priceExGst:
                type: number
              gstAmount:
                type: number
              billingCycle:
                $ref: '#/components/schemas/BillingCycle'
        baselineCapabilities:
          type: array
          items:
            $ref: '#/components/schemas/BaselineFinanceCapability'
          description: Always the complete set. Returned so a client never gates one by mistake.
        entitlementLimits:
          $ref: '#/components/schemas/PlanEntitlementLimits'
        usage:
          type: array
          description: Consumption in the current billing period, with the reset date.
          items:
            type: object
            properties:
              limitKey:
                type: string
              allowed:
                type: integer
              used:
                type: integer
              resetsAt:
                type: string
                format: date-time
        gracePeriodEndsAt:
          type: string
          format: date-time
        currentPeriodEnd:
          type: string
          format: date-time
        pendingPlanId:
          type: string
          description: A scheduled downgrade, visible before it lands.
        pendingEffectiveAt:
          type: string
          format: date-time
        upgradeablePlanIds:
          type: array
          items:
            type: string

    PreviewPlanChangeRequest:
      type: object
      required:
        - targetPlanId
        - targetTariffId
      properties:
        subscriptionId:
          type: string
        targetPlanId:
          type: string
        targetTariffId:
          type: string
        discountCode:
          type: string

    PreviewPlanChangeResponse:
      type: object
      required:
        - success
        - changeType
        - effectiveAt
        - amountPayableNow
        - gstAmount
        - entitlementsGained
        - entitlementsLost
      properties:
        success:
          type: boolean
        changeType:
          type: string
          enum:
            - upgrade
            - downgrade
            - lateral
        effectiveAt:
          type: string
          format: date-time
          description: Immediate for an upgrade; the next renewal date for a downgrade.
        proratedCredit:
          type: number
        amountPayableNow:
          type: number
        gstAmount:
          type: number
        entitlementsGained:
          type: array
          items:
            $ref: '#/components/schemas/FinanceEntitlement'
        entitlementsLost:
          type: array
          items:
            $ref: '#/components/schemas/FinanceEntitlement'
        dataRetentionWarning:
          type: string
          description: Plain statement of what becomes unreadable after a downgrade, shown before the change is confirmed.

    ChangeSubscriptionPlanRequest:
      type: object
      required:
        - targetPlanId
        - targetTariffId
        - acknowledgedEntitlementLoss
        - idempotencyKey
      properties:
        subscriptionId:
          type: string
        targetPlanId:
          type: string
        targetTariffId:
          type: string
        discountCode:
          type: string
        acknowledgedEntitlementLoss:
          type: boolean
          description: Must be true when the preview reported any lost entitlement.
        idempotencyKey:
          type: string

    ChangeSubscriptionPlanResponse:
      type: object
      required:
        - success
        - subscriptionId
        - changeType
        - status
        - effectiveAt
      properties:
        success:
          type: boolean
        subscriptionId:
          type: string
        changeType:
          type: string
          enum:
            - upgrade
            - downgrade
            - lateral
        status:
          type: string
          enum:
            - active
            - past_due
            - scheduled
        effectiveAt:
          type: string
          format: date-time
        subscriptionInvoiceId:
          type: string
        paymentIntentId:
          type: string
        activeEntitlements:
          type: array
          items:
            $ref: '#/components/schemas/FinanceEntitlement'
        pendingEntitlements:
          type: array
          items:
            $ref: '#/components/schemas/FinanceEntitlement'
          description: Set on a scheduled downgrade; these apply from effectiveAt.

    GetFinanceReportRequest:
      type: object
      required:
        - reportType
        - periodStart
        - periodEnd
      properties:
        reportType:
          type: string
          enum:
            - collections_summary
            - payout_register
            - refund_register
            - credit_note_register
            - gst_output_summary
            - tds_register
            - receivables_ageing
            - cash_custody
            - reconciliation_summary
            - subscription_billing
            - ledger_detail
        periodStart:
          type: string
          format: date
        periodEnd:
          type: string
          format: date
        entityId:
          type: string
          description: Defaults to the caller's own scope. A wider scope requires an explicit grant.
        groupBy:
          type: string
          enum:
            - day
            - week
            - month
            - counterparty
            - instrument
            - status
        filters:
          type: object
          additionalProperties: true
        cursor:
          type: string

    GetFinanceReportResponse:
      type: object
      required:
        - success
        - reportType
        - generatedAt
        - basis
        - rows
        - totals
      properties:
        success:
          type: boolean
        reportType:
          type: string
        generatedAt:
          type: string
          format: date-time
        basis:
          type: string
          enum:
            - transaction_date
            - settlement_date
          description: Stated on every report so two differing figures can be reconciled rather than argued over.
        periodLocked:
          type: boolean
          description: True when the underlying accounting period is closed, making the figures final.
        rows:
          type: array
          items:
            type: object
            additionalProperties: true
        totals:
          type: object
          additionalProperties: true
        nextCursor:
          type: string
        truncatedByEntitlement:
          type: boolean
          description: True when the caller's plan capped the range or depth returned.
        requiredEntitlement:
          $ref: '#/components/schemas/FinanceEntitlement'

    ExportFinanceReportRequest:
      type: object
      required:
        - reportType
        - periodStart
        - periodEnd
        - format
      properties:
        reportType:
          type: string
        periodStart:
          type: string
          format: date
        periodEnd:
          type: string
          format: date
        format:
          type: string
          enum:
            - csv
            - xlsx
            - json
            - tally_xml
            - gstr1_json
        entityId:
          type: string
        filters:
          type: object
          additionalProperties: true

    ExportFinanceReportResponse:
      type: object
      required:
        - success
        - exportId
        - status
      properties:
        success:
          type: boolean
        exportId:
          type: string
        status:
          type: string
          enum:
            - queued
            - ready
            - failed
        downloadUrl:
          type: string
          description: Short-lived signed URL, issued only once the export is ready.
        expiresAt:
          type: string
          format: date-time
        rowCount:
          type: integer
        remainingExportsThisPeriod:
          type: integer

    ScheduleFinanceReportRequest:
      type: object
      required:
        - reportType
        - frequency
        - format
        - recipients
      properties:
        scheduleId:
          type: string
          description: Supplied to amend an existing schedule.
        reportType:
          type: string
        frequency:
          type: string
          enum:
            - daily
            - weekly
            - monthly
        format:
          type: string
          enum:
            - csv
            - xlsx
            - json
            - tally_xml
            - gstr1_json
        recipients:
          type: array
          items:
            type: string
          description: Must be verified addresses on the subscriber's own account.
        active:
          type: boolean

    ScheduleFinanceReportResponse:
      type: object
      required:
        - success
        - scheduleId
        - nextRunAt
        - active
      properties:
        success:
          type: boolean
        scheduleId:
          type: string
        nextRunAt:
          type: string
          format: date-time
        active:
          type: boolean
        schedulesUsed:
          type: integer
        schedulesAllowed:
          type: integer

    CancelSubscriptionRequest:
      type: object
      required:
        - subscriptionId
      properties:
        subscriptionId:
          type: string
          description: PlatformSubscription ID to cancel.
        reason:
          type: string
          description: Optional cancellation reason recorded for audit.

    CancelSubscriptionResponse:
      type: object
      required:
        - success
        - status
        - cancelledAt
        - accessUntil
      properties:
        success:
          type: boolean
        status:
          type: string
          enum:
            - cancelled
        cancelledAt:
          type: string
          format: date-time
        accessUntil:
          type: string
          format: date-time
          description: Equals PlatformSubscription.currentPeriodEnd; plan limits stay enforced until this date.

    RegisterDeviceTokenRequest:
      type: object
      required:
        - token
        - platform
      properties:
        token:
          type: string
          description: FCM registration token from the Service Worker.
        platform:
          type: string
          enum:
            - web
            - android
            - ios
        revoke:
          type: boolean
          description: Removes the token on sign-out. Revoking an absent token is a no-op.

    RegisterDeviceTokenResponse:
      type: object
      required:
        - success
        - tokenCount
      properties:
        success:
          type: boolean
        tokenCount:
          type: integer
          description: Number of tokens registered for the caller after the operation.

    ErrorResponse:
      type: object
      required:
        - error
      properties:
        error:
          type: object
          required:
            - status
            - message
          properties:
            status:
              type: string
              description: Specific error code.
              example: PERMISSION_DENIED
            message:
              type: string
              description: Human-readable error description.
              example: Caller lacks permission or role validation fails.

<?php

namespace Database\Factories;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Tenant>
 */
class TenantFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'nric' => fake()->unique()->numerify('######-##-####'),
            'phone_number' => fake()->unique()->numerify('+601########'),
            'address_line1' => fake()->streetAddress(),
            'address_line2' => fake()->optional()->secondaryAddress(),
            'zip_code' => fake()->postcode(),
            'city' => fake()->city(),
            'state' => fake()->state(),
        ];
    }

    /**
     * Indicate the tenant has a secondary address line.
     */
    public function withAddressLine2(): static
    {
        return $this->state(fn (array $attributes) => [
            'address_line2' => fake()->secondaryAddress(),
        ]);
    }
}

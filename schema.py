"""Schema definitions for API validation"""
from marshmallow import Schema, fields, validate, ValidationError

# User schema
class UserSchema(Schema):
    """User schema for validation"""
    id = fields.Int(dump_only=True)
    username = fields.Str(required=True, validate=validate.Length(min=3, max=50))
    password = fields.Str(required=True, validate=validate.Length(min=6))

class UserCreateSchema(Schema):
    """Schema for user creation - password required"""
    username = fields.Str(required=True, validate=validate.Length(min=3, max=50))
    password = fields.Str(required=True, validate=validate.Length(min=6))

# Project schema
class ProjectSchema(Schema):
    """Project schema for validation"""
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    clientName = fields.Str(allow_none=True)
    userId = fields.Int(required=True)
    createdAt = fields.DateTime(dump_only=True)

class ProjectCreateSchema(Schema):
    """Schema for project creation"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    clientName = fields.Str(allow_none=True)
    userId = fields.Int(required=True)

# Brand Values schema
class BrandValueSchema(Schema):
    """Brand value schema"""
    id = fields.Str(required=True)
    value = fields.Str(required=True)

# Brand Input schema
class BrandInputSchema(Schema):
    """Brand input schema for validation"""
    brandName = fields.Str(required=True, validate=validate.Length(min=1))
    industry = fields.Str()
    description = fields.Str()
    values = fields.List(fields.Nested(BrandValueSchema()))
    designStyle = fields.Str(validate=validate.OneOf(["modern", "classic", "minimalist", "bold"]))
    colorPreferences = fields.List(fields.Str(), required=False)

# Brand Logo schema
class LogoSchema(Schema):
    """Logo schema"""
    primary = fields.Str(required=True)
    monochrome = fields.Str(required=True)
    reverse = fields.Str(required=True)

# Brand Color schema
class ColorSchema(Schema):
    """Color schema"""
    name = fields.Str(required=True)
    hex = fields.Str(required=True)
    type = fields.Str(required=True, validate=validate.OneOf(["primary", "secondary", "accent", "base"]))

# Typography schema
class TypographySchema(Schema):
    """Typography schema"""
    headings = fields.Str(required=True)
    body = fields.Str(required=True)

# Mockup schema
class MockupSchema(Schema):
    """Mockup schema"""
    type = fields.Str(required=True)
    imageUrl = fields.Str(required=True)

# Brand Output schema
class BrandOutputSchema(Schema):
    """Brand output schema for validation"""
    logo = fields.Nested(LogoSchema, required=True)
    colors = fields.List(fields.Nested(ColorSchema), required=True)
    typography = fields.Nested(TypographySchema, required=True)
    logoDescription = fields.Str(required=False)
    tagline = fields.Str(required=False)
    contactName = fields.Str(required=False)
    contactTitle = fields.Str(required=False)
    contactPhone = fields.Str(required=False)
    address = fields.Str(required=False)
    mockups = fields.List(fields.Nested(MockupSchema), required=False)

# Brand Concept schema
class BrandConceptSchema(Schema):
    """Brand concept schema for validation"""
    id = fields.Int(dump_only=True)
    projectId = fields.Int(required=True)
    name = fields.Str(required=True)
    createdAt = fields.DateTime(dump_only=True)
    brandInputs = fields.Nested(BrandInputSchema, required=True)
    brandOutput = fields.Nested(BrandOutputSchema, required=True)
    isActive = fields.Bool(default=False)

class BrandConceptCreateSchema(Schema):
    """Schema for brand concept creation"""
    projectId = fields.Int(required=True)
    name = fields.Str(required=True)
    brandInputs = fields.Nested(BrandInputSchema, required=True)
    brandOutput = fields.Nested(BrandOutputSchema, required=True)
    isActive = fields.Bool(default=False)

# Regenerate Element schema
class RegenerateElementSchema(Schema):
    """Schema for element regeneration"""
    conceptId = fields.Int(required=True)
    elementType = fields.Str(required=True, validate=validate.OneOf(["colors", "typography", "logo", "tagline"]))

# Initialize schemas
user_schema = UserSchema()
users_schema = UserSchema(many=True)
user_create_schema = UserCreateSchema()

project_schema = ProjectSchema()
projects_schema = ProjectSchema(many=True)
project_create_schema = ProjectCreateSchema()

brand_input_schema = BrandInputSchema()
brand_output_schema = BrandOutputSchema()

brand_concept_schema = BrandConceptSchema()
brand_concepts_schema = BrandConceptSchema(many=True)
brand_concept_create_schema = BrandConceptCreateSchema()

regenerate_element_schema = RegenerateElementSchema()
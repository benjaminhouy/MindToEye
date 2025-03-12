"""Schema definitions for API validation"""
from marshmallow import Schema, fields, validate
from typing import Dict, List, Any, Optional

class UserSchema(Schema):
    """User schema for validation"""
    id = fields.Int(dump_only=True)
    username = fields.Str(required=True, validate=validate.Length(min=3, max=50))
    password = fields.Str(required=True, validate=validate.Length(min=6))

class UserCreateSchema(Schema):
    """Schema for user creation - password required"""
    username = fields.Str(required=True, validate=validate.Length(min=3, max=50))
    password = fields.Str(required=True, validate=validate.Length(min=6))

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

class BrandValueSchema(Schema):
    """Brand value schema"""
    id = fields.Str(required=True)
    value = fields.Str(required=True)

class BrandInputSchema(Schema):
    """Brand input schema for validation"""
    brandName = fields.Str(required=True, validate=validate.Length(min=1))
    industry = fields.Str()
    description = fields.Str()
    values = fields.List(fields.Nested(BrandValueSchema()))
    designStyle = fields.Str(validate=validate.OneOf(["modern", "classic", "minimalist", "bold"]))
    colorPreferences = fields.List(fields.Str(), required=False)

class LogoSchema(Schema):
    """Logo schema"""
    primary = fields.Str(required=True)
    monochrome = fields.Str(required=True)
    reverse = fields.Str(required=True)

class ColorSchema(Schema):
    """Color schema"""
    name = fields.Str(required=True)
    hex = fields.Str(required=True)
    type = fields.Str(required=True, validate=validate.OneOf(["primary", "secondary", "accent", "base"]))

class TypographySchema(Schema):
    """Typography schema"""
    headings = fields.Str(required=True)
    body = fields.Str(required=True)

class MockupSchema(Schema):
    """Mockup schema"""
    type = fields.Str(required=True)
    imageUrl = fields.Str(required=True)

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

class RegenerateElementSchema(Schema):
    """Schema for element regeneration"""
    conceptId = fields.Int(required=True)
    elementType = fields.Str(required=True, validate=validate.OneOf(["colors", "typography", "logo", "tagline"]))
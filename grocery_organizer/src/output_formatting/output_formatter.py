from grocery_organizer.src.core.models import FullProduct

# TODO need to consider output_format option in main
class OutputFormatter:
    def __init__(self, products:[FullProduct]):
        self.products=products

    def format_output(self):
        longest_original_input = 14
        longest_found_product = 13
        for product in self.products:
            if len(product.input_name) > longest_original_input:
                longest_original_input = len(product.input_name)
            if len(product.found_product) > longest_found_product:
                longest_found_product = len(product.found_product)

        formatted_string = 'Original Input'.ljust(longest_original_input) + '\t' + 'Found Product'.ljust(longest_found_product) + '\t' + 'Aisle Number' + '\n'
        for product in self.products:
            formatted_line = product.input_name.ljust(longest_original_input) + '\t' + product.found_product.ljust(longest_found_product) + '\t' + product.aisle_number + '\n'
            formatted_string += formatted_line

        return formatted_string